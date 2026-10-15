#!/usr/bin/env bash
# 6-20 배포: LEAN 백테스트를 GNB 에서 빼고 우측 offcanvas 「LEAN」 메뉴(전체 워크플로우 + 종목별 세부 화면 서브메뉴)로 이동,
#           결과 지표 3형태(① 수익 ② 위험 ③ 실행) 구분 + 지표별 상황 설명(METRIC GUIDE) 추가.
# domain-rag-lab 루트에서 실행. 정적 파일만이라 재시작 없음 — 호스트 소스(~/domain-rag-lab/frontend) + 컨테이너(domain-rag-lab-api-1:/app/frontend) 양쪽 갱신.
# (frontend/ 는 Dockerfile 에서 이미지에 COPY 되므로 재빌드 시 덮이지 않게 호스트 소스도 같이 바꾼다. main 에 push 하면 cd.yml 이 어차피 재빌드한다.)
set -euo pipefail
cd "$(dirname "$0")/.."
K=/home/ubuntu/lumina-invest/fd.edumgt.co.kr.pem; H=ubuntu@43.201.229.188
FILES="frontend/index.html frontend/app.js frontend/style.css"
tar czf - $FILES deploy/pr-lean-menu.sh | ssh -i "$K" -o StrictHostKeyChecking=no "$H" "
  set -e; cd ~/domain-rag-lab && tar xzf - && echo 'host source updated'
  tar cf - $FILES | sudo -n docker cp - domain-rag-lab-api-1:/app/
  sudo -n docker exec domain-rag-lab-api-1 grep -c 'renderLeanNav' /app/frontend/app.js
  sudo -n docker exec domain-rag-lab-api-1 grep -c 'backtest-metric-guide' /app/frontend/style.css
  sudo -n docker exec domain-rag-lab-api-1 grep -c '20261015-lean-menu' /app/frontend/index.html
"
echo "== live check"
curl -s -m 10 https://pr.edumgt.co.kr/ | grep -o 'app.js?v=[^"]*\|id="openRightPanel"\|id="leanNav"' || true
echo "done. 확인: https://pr.edumgt.co.kr/ → 우측 상단 「LEAN」 → 전체 워크플로우 / 종목별 서브메뉴(삼성전자·KOSPI 200·현대차·SK하이닉스·S&P 500) 각각 화면 → 「이 조건으로 검증하기」 뒤 지표 카드 색 띠 + METRIC GUIDE"
