---
id: HX-005
title: 프런트엔드 상단 바에 사이드바 트리거 버튼 및 사이드바 세 상태 구현
priority: P1
status: todo
area: frontend
stages: [pm, design, dev, qa]
acceptance:
  - "frontend/index.html 및 frontend/days/01.html 등 주요 화면 상단 바 왼쪽에 사이드바 트리거 버튼(데스크톱: 패널 아이콘, 모바일: 햄버거 아이콘)을 추가한다."
  - 좌측 오프캔버스 사이드바가 데스크톱에서 펼침(open), 레일(rail), 모바일에서 시트(sheet) 세 상태를 갖추도록 구현한다.
  - 상태는 localStorage에 저장하며, 접근성(aria-controls, aria-expanded) 및 단축키(Ctrl/⌘+B, Alt+M)를 지원한다.
  - 변경 사항에 대한 UI 및 동작 테스트를 포함한다.
---
## 배경

frontend/days/assets/app-shell.js 1~26, frontend/index.html 23~50 사이드바 트리거 버튼과 세 상태 구현이 가이드에 미흡하며, 기존에 사이드바가 단일 상태로만 동작하는 것으로 보임. 가이드 준수를 위해 세 상태 구현과 트리거 버튼 추가가 필요하다.

## 범위

- 상단 바 왼쪽에 사이드바 트리거 버튼 추가
- 사이드바 세 상태(open, rail, sheet) 구현 및 localStorage 연동
- 접근성 속성 및 단축키 지원 추가
- UI/동작 테스트 작성

## 참고 파일

- frontend/index.html
- frontend/days/assets/app-shell.js

## 출처

Tech Lead 에이전트 제안. 사람이 검토 후 `hermes-fleet approve <repo> <ID>`로 승인한다.
