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

환경 파일 `/home/ubuntu/domain-rag-lab/.env.prod`(600)는 서버에만 있습니다. 항목은 루트 `.env.prod.example`과 같고, 이 서버에서는 `VLLM_BASE_URL=http://fin-ai-ollama:11434/v1`, `VLLM_MODEL=qwen2.5:1.5b`, `LEAN_RUNNER=local`로 설정했습니다. 다른 모델을 쓰려면 `sudo docker exec fin-ai-ollama ollama list`로 확인 후 값만 바꾸고 `up -d`로 api만 재생성합니다.

GitHub Actions `cd.yml`을 이 서버로 돌리려면 시크릿 `EC2_HOST=43.201.229.188`, `EC2_SSH_PRIVATE_KEY=fd.edumgt.co.kr.pem 내용`, `EC2_APP_DIR=/home/ubuntu/domain-rag-lab`으로 바꾸고, 워크플로의 compose 명령을 `-f deploy/pr-edumgt/compose.yml`로 수정해야 합니다(`docker-compose.prod.yml`은 자체 Caddy가 80/443을 열어 기존 Caddy와 충돌합니다).

## LEAN 백테스트(로컬 러너)

2026-10-02 루트 EBS 볼륨 `vol-0e250a095c557b18a`를 50GB → 150GB(gp3)로 확장하고(`growpart` + `resize2fs`, 재부팅 없음) `quantconnect/lean:latest`를 받아 두었습니다. 이 이미지는 압축 14GB·해제 후 수십 GB로, 50GB 디스크에서는 pull이 `no space left on device`로 실패합니다.

로컬 러너는 API 컨테이너에 호스트 Docker 소켓과 작업 폴더를 마운트해야 합니다. `compose.yml`의 api 서비스에 아래가 들어가야 하며, 작업 폴더 `/home/ubuntu/domain-rag-lab/data/lean-workflows`는 서버에 만들어 두었습니다.

```yaml
    environment:
      LEAN_RUNNER: local
      LEAN_LOCAL_WORKDIR: /app/data/lean-workflows
      LEAN_LOCAL_WORKDIR_HOST: /home/ubuntu/domain-rag-lab/data/lean-workflows
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /home/ubuntu/domain-rag-lab/data/lean-workflows:/app/data/lean-workflows
```

적용 후 `sudo docker compose -f deploy/pr-edumgt/compose.yml up -d api`로 api만 재생성하고, 백테스트 메뉴 또는 `POST /backtests/run`으로 확인합니다.

## 서버 중지·기동 배치와 한국 공휴일

EventBridge Scheduler(`default` 그룹)의 `ec2-office-hours-start-0840`(08:40 KST 기동)과 `ec2-office-hours-stop-1740`(17:40 KST 중지)이 이 서버와 `i-06f9ae097f2e86af4` 두 대를 매일 돌립니다. cron 식으로는 날짜를 제외할 수 없어, 공휴일에는 08:50 KST에 두 대를 다시 중지하는 일회성 일정을 `kr-holidays` 그룹에 둡니다(실행 후 자동 삭제). 목록과 생성·갱신은 [kr_holiday_stop_schedules.py](kr_holiday_stop_schedules.py)가 담당하며, 2026-10-03~2027-12-27의 법정 공휴일·대체공휴일이 등록돼 있습니다. 임시공휴일·선거일이 지정되면 `HOLIDAYS`에 추가해 다시 실행합니다.

```bash
python3 deploy/pr-edumgt/kr_holiday_stop_schedules.py --list
```

## DNS

권한 네임서버는 `ns1~4.whoisdomain.kr`(도메인 등록 대행사)이며 이 AWS 계정의 Route53이 아닙니다.

2026-10-02 `pr` 레코드를 **A 43.201.229.188**로 변경했습니다(fd와 동일). Caddy가 Let's Encrypt 인증서(이미 발급됨)를 자동 갱신합니다. 변경 직후 일부 리졸버와 whoisdomain 네임서버 일부는 이전 CNAME(d2apml5a2k9wye.cloudfront.net)을 최대 3600초 캐시할 수 있습니다.

CloudFront `EN6D00UF52FM3`와 ACM 요청 `d8376e43-…`(us-east-1, PENDING_VALIDATION)은 더 이상 필요하지 않습니다. Caddy의 CloudFront 원본용 HTTP 블록은 남겨 두어도 무해하며, 정리하려면 CloudFront 배포를 비활성화 후 삭제하고 ACM 요청을 삭제합니다. `deploy/walk-forward/activate-cloudfront.py`는 CloudFront 경로를 다시 쓸 때만 사용합니다.

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
