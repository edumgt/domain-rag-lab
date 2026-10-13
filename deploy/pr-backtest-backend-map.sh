#!/usr/bin/env bash
# 6-17 배포: LEAN 백테스트 뷰 — 테스트 상세(「이 테스트의 질문」 위)에 실행 시 호출되는 백엔드 파이썬 파일 구조 블록 추가.
# domain-rag-lab 루트에서 실행. 정적 파일만이라 재시작 없음 — 호스트 소스(~/domain-rag-lab/frontend) + 컨테이너(domain-rag-lab-api-1:/app/frontend) 양쪽 갱신.
# (frontend/ 는 Dockerfile 에서 이미지에 COPY 되므로 재빌드 시 덮이지 않게 호스트 소스도 같이 바꾼다. main 에 push 하면 cd.yml 이 어차피 재빌드한다.)
set -euo pipefail
cd "$(dirname "$0")/.."
K=/home/ubuntu/lumina-invest/fd.edumgt.co.kr.pem; H=ubuntu@43.201.229.188
FILES="frontend/index.html frontend/app.js frontend/style.css"
tar czf - $FILES deploy/pr-backtest-backend-map.sh | ssh -i "$K" -o StrictHostKeyChecking=no "$H" "
  set -e; cd ~/domain-rag-lab && tar xzf - && echo 'host source updated'
  tar cf - $FILES | sudo -n docker cp - domain-rag-lab-api-1:/app/
  sudo -n docker exec domain-rag-lab-api-1 grep -c 'renderBacktestBackendMap' /app/frontend/app.js
  sudo -n docker exec domain-rag-lab-api-1 grep -c 'backtest-backend-map' /app/frontend/style.css
  sudo -n docker exec domain-rag-lab-api-1 grep -c '20261013-backend-map' /app/frontend/index.html
"
echo "done. 확인: https://pr.edumgt.co.kr/ → LEAN 백테스트 메뉴 → TEST LIBRARY 아무 카드 클릭 → 「BACKEND FILES」 블록이 「이 테스트의 질문」 위에 보이는지"
