#!/usr/bin/env bash
# 6-22 배포: 종목 보기 재무건전성(알트먼 Z-Score) — DART 수집기(한 시간에 한 종목) + 카드 배지 + 모달 패널 + 종목 보기 15% 축소.
# domain-rag-lab 루트에서 실행. 백엔드 코드·새 테이블·환경변수가 바뀌므로 cd.yml 과 같은 `compose up --build -d` 로 api 를 재생성한다.
#   1) 호스트 소스(~/domain-rag-lab) 갱신   2) ~/domain-rag-lab/.env.prod 에 DART_API_KEY 가 없으면 같은 서버의 ~/lumina-invest/.env 에서 복사
#   3) api 재빌드·재기동 → 기동 45초 후 수집기가 첫 종목(삼성전자)을 수집, 이후 1시간마다 한 종목
set -euo pipefail
cd "$(dirname "$0")/.."
K=/home/ubuntu/lumina-invest/fd.edumgt.co.kr.pem; H=ubuntu@43.201.229.188
FILES="frontend/index.html frontend/app.js frontend/style.css \
app/main.py app/core/config.py app/api/routes/market.py \
app/models/stock_financial_health.py app/services/dart_client.py app/services/altman.py app/services/financial_health_collector.py \
app/services/system_schedule_data.py app/ops/collect_financial_health.py tests/test_financial_health.py tests/test_system_schedule.py \
.env.example .env.prod.example deploy/pr-zscore.sh"
tar czf - $FILES | ssh -i "$K" -o StrictHostKeyChecking=no "$H" "
  set -e; cd ~/domain-rag-lab && tar xzf - && echo 'host source updated'
  if ! grep -q '^DART_API_KEY=' .env.prod; then
    KEY=\$(grep '^DART_API_KEY=' ~/lumina-invest/.env | cut -d= -f2-)
    if [ -z \"\$KEY\" ]; then echo 'ERROR: ~/lumina-invest/.env 에 DART_API_KEY 가 없습니다. .env.prod 에 직접 넣고 다시 실행하세요.'; exit 1; fi
    printf '\n# DART(금융감독원 전자공시) 인증키 — 종목 보기 재무건전성(알트먼 Z-Score) 수집기. lumina-invest 와 같은 키.\nDART_API_KEY=%s\n' \"\$KEY\" >> .env.prod
    echo 'DART_API_KEY appended to .env.prod'
  else echo 'DART_API_KEY already in .env.prod'; fi
  sudo -n docker compose -f deploy/pr-edumgt/compose.yml up --build -d api
  sudo -n docker compose -f deploy/pr-edumgt/compose.yml exec -T api curl -sf --retry 12 --retry-delay 5 --retry-connrefused http://localhost:8000/health >/dev/null && echo 'api healthy'
  sudo -n docker compose -f deploy/pr-edumgt/compose.yml exec -T api python -c 'from app.services import dart_client; print(\"dart enabled:\", dart_client.is_enabled())'
"
echo "== live check"
curl -s -m 10 https://pr.edumgt.co.kr/ | grep -o 'app.js?v=[^"]*' || true
curl -s -m 10 https://pr.edumgt.co.kr/market/financial-health/summary | head -c 300; echo
echo "done. 확인: https://pr.edumgt.co.kr/?view=stocks → 카드 산업 옆 「재무건전성 안전/회색/위험」 배지(수집된 종목만), 매거진 보기 → FINANCIAL HEALTH 섹션."
echo "      수집 로그: sudo docker logs --since 10m domain-rag-lab-api-1 | grep 재무건전성"
echo "      바로 채우기: sudo docker compose -f deploy/pr-edumgt/compose.yml exec api python -m app.ops.collect_financial_health --next 10 --sleep 2"
