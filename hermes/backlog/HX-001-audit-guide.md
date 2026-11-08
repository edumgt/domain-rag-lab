---
id: HX-001
title: Audit Guide 페이지의 버그 수정 및 테스트 추가
priority: P1
status: proposed
area: frontend
stages: [dev, qa]
acceptance:
  - 페이지가 올바르게 로드되어야 합니다.
  - 모든 메뉴 항목이 올바르게 표시되어야 합니다.
  - 페이지가 정상적으로 작동해야 합니다.
---
## 배경

audit-guide.js 파일의 58줄에서 버그가 발견되었습니다. 버그는 페이지 로드 시 오류가 발생합니다.

## 범위

- audit-guide.js 파일의 버그 수정
- audit-guide.js 파일에 테스트 코드 추가

## 참고 파일

- frontend/assets/audit-guide.js

## 출처

Tech Lead 에이전트 제안. 사람이 검토 후 `hermes-fleet approve <repo> <ID>`로 승인한다.
