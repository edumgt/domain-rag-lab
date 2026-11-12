---
id: HX-003
title: 프런트엔드 주요 화면에서 브라우저 세로 스크롤 및 바닥 빈 공간 제거
priority: P1
status: todo
area: frontend
stages: [pm, design, dev, qa]
acceptance:
  - 1920×1080 FHD 뷰포트에서 주요 화면(document.scrollHeight)이 window.innerHeight 이하로 유지되어 브라우저 세로 스크롤이 발생하지 않아야 한다.
  - 각 화면의 바닥에 80px 이상의 빈 띠가 남지 않도록 레이아웃 조정 및 카드/패널 높이 조절이 이루어져야 한다.
  - 긴 목록·로그 등은 페이지 전체가 늘어나지 않고 카드 내부 영역에서 자체 스크롤(overflow:auto)로 처리되어야 한다.
  - 카드 내부 콘텐츠 폭이 카드 폭의 70% 이상일 때 실제 콘텐츠 폭도 70% 이상인지 확인하고, 미만 시 max-width 1120px 중앙 정렬 또는 2~3열 재배치가 적용되어야 한다.
  - Playwright 기반 자동 측정에서 document.scrollHeight ≤ window.innerHeight, 바닥 빈 공간 80px 미만, 내부 스크롤 정상 작동을 검증한다.
---
## 배경

frontend/days/01.html 등 주요 학습 페이지에서 문서 높이가 window.innerHeight를 초과해 브라우저 세로 스크롤이 발생함을 확인.
예를 들어 frontend/days/01.html은 3774줄에 달하는 대용량 HTML이며, 내용이 많아 한 화면에 들어오지 않고 스크롤이 생김.
프런트엔드 가이드에 따르면 주요 화면은 한 화면에 들어와야 하며, 긴 목록·로그는 내부 스크롤로 처리해야 함.
또한 카드 내부 폭과 콘텐츠 폭 불일치, 바닥 빈 공간 과다 문제도 다수 존재할 가능성 있음.

## 범위

- {'주요 학습 페이지(예': 'frontend/days/01.html) 레이아웃 점검 및 문서 높이 최적화'}
- 카드 및 패널 높이 조절, 내부 스크롤 적용(overflow:auto, flex/vh 단위 활용)
- 바닥 빈 공간 80px 이상 발생 화면에 대해 패딩/마진 조정 또는 max-width 중앙 정렬 적용
- 긴 목록·로그는 페이지 스크롤 대신 카드 내부 스크롤로 변경
- Playwright 기반 자동 측정 스크립트로 document.scrollHeight, window.innerHeight, 바닥 빈 공간 측정 및 검증

## 참고 파일

- frontend/days/01.html
- frontend/days/assets/app-shell.css
- frontend/days/assets/site.css

## 출처

Tech Lead 에이전트 제안. 사람이 검토 후 `hermes-fleet approve <repo> <ID>`로 승인한다.
