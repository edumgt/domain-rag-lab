# Walk-Forward 전용 EC2 배포

> **대체됨(2026-10-02):** pr.edumgt.co.kr 전체 앱이 같은 EC2로 이전되어 `deploy/pr-edumgt/`가 Walk-Forward 경로를 포함한 모든 요청을 처리합니다. 이 디렉터리의 전용 컨테이너와 `Caddyfile.fragment`는 내렸고, CloudFront/ACM 리소스 파일과 `activate-cloudfront.py`만 계속 사용합니다.

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

## AWS SSL 전환

기존 edumgt 사이트와 동일하게 CloudFront + ACM을 사용합니다. 기존 CloudFront 배포는 변경하지 않습니다.

- 전용 CloudFront: `EN6D00UF52FM3` / `d2apml5a2k9wye.cloudfront.net`
- 전용 ACM(us-east-1): `d8376e43-74c0-4b1c-871c-2ce1c750daf7`
- 원본 HTTP 설정: `Caddyfile.aws-origin.fragment`
- 생성 당시 설정: `cloudfront.initial.json`
- 리소스 및 DNS 값: `aws-resources.json`

먼저 인증 CNAME을 등록하고 ACM 상태가 `ISSUED`인지 확인합니다. 이후 전용 배포의 Aliases에 `pr.edumgt.co.kr`을 추가하고 ViewerCertificate에 위 ACM ARN, `SSLSupportMethod=sni-only`, `MinimumProtocolVersion=TLSv1.2_2021`을 설정합니다. 최신 ETag와 기존 전체 설정을 가져와 업데이트합니다.

CloudFront 배포가 완료된 후 DNS의 기존 `pr` A 레코드를 제거하고 `pr` CNAME을 `d2apml5a2k9wye.cloudfront.net`으로 설정합니다. 인증 CNAME은 자동 갱신을 위해 유지합니다. 사용자→CloudFront 구간은 ACM HTTPS, CloudFront→EC2 구간은 HTTP를 사용합니다. 검증 설정 쿼리가 원본에 전달되도록 AllViewerExceptHostHeader 정책을 적용하고 캐싱을 비활성화했습니다.
