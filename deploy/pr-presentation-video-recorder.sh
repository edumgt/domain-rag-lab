#!/usr/bin/env bash
# 6-16 배포: 프로젝트2 발표 페이지에 「화면 녹화 스크립트로 시연 동영상 만들기」(python-basic-lab) 섹션 추가.
# domain-rag-lab 루트에서 실행. 정적 파일만이라 재시작 없음 — 호스트 소스(~/domain-rag-lab/frontend) + 컨테이너(domain-rag-lab-api-1:/app/frontend) 양쪽 갱신.
# (frontend/ 는 Dockerfile 에서 이미지에 COPY 되므로 재빌드 시 덮이지 않게 호스트 소스도 같이 바꾼다.)
set -euo pipefail
cd "$(dirname "$0")/.."
K=/home/ubuntu/lumina-invest/fd.edumgt.co.kr.pem; H=ubuntu@43.201.229.188
FILES="frontend/project2-presentation.html frontend/assets/project2-presentation.css"
tar czf - $FILES deploy/pr-presentation-video-recorder.sh | ssh -i "$K" -o StrictHostKeyChecking=no "$H" "
  set -e; cd ~/domain-rag-lab && tar xzf - && echo 'host source updated'
  tar cf - $FILES | sudo -n docker cp - domain-rag-lab-api-1:/app/
  sudo -n docker exec domain-rag-lab-api-1 grep -c 'id=\"videoRecorder\"' /app/frontend/project2-presentation.html
"
echo "done. 확인: https://pr.edumgt.co.kr/static/project2-presentation.html#videoRecorder"
