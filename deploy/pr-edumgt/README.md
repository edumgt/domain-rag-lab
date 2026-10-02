# pr.edumgt.co.kr 전체 앱 EC2 배포

대상: `i-0436b32f1d5c9ae5b` (`43.201.229.188`, Elastic IP). 같은 서버에서 `fd.edumgt.co.kr`(lumina-invest)과 `pr.edumgt.co.kr`(이 저장소) 두 도메인을 함께 운영합니다.
배포 디렉터리: `/home/ubuntu/domain-rag-lab`. SSH 키: `fd.edumgt.co.kr.pem`(인스턴스 키 페어).

이전 pr 원본 `15.165.30.183`은 이 계정에 더 이상 존재하지 않아 연결이 시간 초과되었습니다. 그래서 pr 앱 전체를 이 서버로 옮겼습니다.

## 구성

```text
브라우저 ─HTTPS─▶ lumina-invest Caddy(:80/:443, shared-net)
                    ├─ fd.edumgt.co.kr  → app:8000     (lumina-invest, 변경 없음)
                    └─ pr.edumgt.co.kr  → pr-api:8000  (이 저장소, deploy/pr-edumgt/compose.yml)
                                           ├─ postgres(pgvector) · redis · qdrant (프로젝트 내부 네트워크)
                                           └─ LLM: fin-ai-ollama:11434/v1 (lumina-invest Ollama 공유, 읽기 호출만)
```

- 신규 컨테이너는 호스트 포트를 공개하지 않습니다. 기존 fd 컨테이너, 데이터베이스, Caddy 컨테이너는 재시작하지 않습니다.
- Caddy 설정은 `/home/ubuntu/lumina-invest/infra/fd-edumgt/Caddyfile`에 `Caddyfile.fragment`의 두 블록을 추가해 reload 합니다. 이 파일은 컨테이너에 bind mount 되어 있으므로 `sed -i`/`mv`가 아니라 `tee`/`cp`로 같은 inode에 덮어써야 컨테이너가 변경을 봅니다.
- 이전의 Walk-Forward 전용 컨테이너(`deploy/walk-forward`)는 전체 앱이 `/walk-forward.html`과 API를 모두 제공하므로 내렸습니다.

## 배포·갱신

```bash
# 로컬 → 서버 동기화(.github/workflows/cd.yml 과 같은 제외 규칙)
rsync -az --delete --exclude '.env' --exclude '.env.*' --exclude '.git' --exclude '__pycache__' --exclude '*.pyc' --exclude '*.pem' \
  -e 'ssh -i /home/ubuntu/lumina-invest/fd.edumgt.co.kr.pem' ./ ubuntu@43.201.229.188:/home/ubuntu/domain-rag-lab/

# 서버에서
cd /home/ubuntu/domain-rag-lab
sudo docker compose -f deploy/pr-edumgt/compose.yml up --build -d
sudo docker compose -f deploy/pr-edumgt/compose.yml ps
```

환경 파일 `/home/ubuntu/domain-rag-lab/.env.prod`(600)는 서버에만 있습니다. 항목은 루트 `.env.prod.example`과 같고, 이 서버에서는 `VLLM_BASE_URL=http://fin-ai-ollama:11434/v1`, `VLLM_MODEL=qwen2.5:1.5b`, `LEAN_RUNNER=off`로 설정했습니다. 다른 모델을 쓰려면 `sudo docker exec fin-ai-ollama ollama list`로 확인 후 값만 바꾸고 `up -d`로 api만 재생성합니다.

GitHub Actions `cd.yml`을 이 서버로 돌리려면 시크릿 `EC2_HOST=43.201.229.188`, `EC2_SSH_PRIVATE_KEY=fd.edumgt.co.kr.pem 내용`, `EC2_APP_DIR=/home/ubuntu/domain-rag-lab`으로 바꾸고, 워크플로의 compose 명령을 `-f deploy/pr-edumgt/compose.yml`로 수정해야 합니다(`docker-compose.prod.yml`은 자체 Caddy가 80/443을 열어 기존 Caddy와 충돌합니다).

## DNS

권한 네임서버는 `ns1~4.whoisdomain.kr`(도메인 등록 대행사)이며 이 AWS 계정의 Route53이 아닙니다.

권장: `pr` 레코드를 `fd`와 같이 **A 43.201.229.188**로 둡니다. Caddy가 Let's Encrypt 인증서(이미 발급됨)를 자동 갱신하고, CloudFront의 60초 원본 응답 제한과 추가 비용이 없습니다.

현재: `pr` 은 **CNAME d2apml5a2k9wye.cloudfront.net**(전용 CloudFront `EN6D00UF52FM3`)입니다. 이 경로도 동작하도록 Caddy에 CloudFront 원본용 HTTP 블록을 두었고, ACM 인증서가 `ISSUED`되면 `deploy/walk-forward/activate-cloudfront.py`가 Alias·인증서·전체 HTTP 메서드·60초 타임아웃을 설정합니다. A 레코드로 바꾼 뒤에는 CloudFront 배포를 비활성화해도 됩니다.

## 확인

```bash
curl -sk --resolve pr.edumgt.co.kr:443:43.201.229.188 -o /dev/null -w '%{http_code}\n' https://pr.edumgt.co.kr/health
curl -sk --resolve pr.edumgt.co.kr:443:43.201.229.188 -o /dev/null -w '%{http_code}\n' https://pr.edumgt.co.kr/walk-forward.html
curl -sk --resolve fd.edumgt.co.kr:443:43.201.229.188 -o /dev/null -w '%{http_code}\n' https://fd.edumgt.co.kr/
```

## 롤백

1. Caddyfile에서 추가한 pr 두 블록을 제거하고 `sudo docker exec lumina-invest-proxy-1 caddy reload --config /etc/caddy/Caddyfile`.
2. `sudo docker compose -f deploy/pr-edumgt/compose.yml down` (볼륨 유지. 데이터까지 지우려면 `-v`).
3. lumina-invest compose에는 `down`을 실행하지 않습니다.
