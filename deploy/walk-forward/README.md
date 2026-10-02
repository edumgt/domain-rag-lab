# Walk-Forward 전용 EC2 배포

대상: `i-0436b32f1d5c9ae5b` (`43.201.229.188`).
배포 디렉터리: `/home/ubuntu/pr-walk-forward`.

기존 lumina-invest Caddy와 `shared-net`을 사용합니다. 신규 컨테이너는 호스트 포트를 공개하지 않습니다. 기존 fd 서비스나 데이터베이스를 재시작하지 않습니다.

```bash
sudo docker compose -f deploy/walk-forward/compose.yml up --build -d
```

`Caddyfile.fragment`의 pr 도메인 블록을 기존 `/home/ubuntu/lumina-invest/infra/fd-edumgt/Caddyfile`에 추가한 뒤 validate/reload합니다. 기존 fd 블록은 유지합니다. 검증 HTML, API와 세 개의 자산 경로만 새 컨테이너로 전달하며 나머지는 기존 pr 원본 `15.165.30.183`으로 전달합니다.

공개 URL: `https://pr.edumgt.co.kr/walk-forward.html`.
현재 DNS는 `15.165.30.183`입니다. DNS 관리자의 A 레코드 변경(`43.201.229.188`)이 필요하며, 변경 전 기존 pr 원본 서버의 접근 가능 여부를 확인해야 합니다. 배포 시점에 기존 원본의 HTTP/HTTPS 연결은 시간 초과되었습니다. 기존 pr 기능까지 이 서버로 옮기려면 별도 전체 앱 이전이 필요합니다.

롤백은 추가한 pr Caddy 블록을 백업에서 복구한 뒤 reload하고, 위 compose의 `down`으로 전용 컨테이너만 종료합니다. 기존 lumina-invest compose에는 `down`을 실행하지 않습니다.
