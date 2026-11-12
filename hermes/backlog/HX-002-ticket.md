---
id: HX-002
title: 프런트엔드 상단 탭 내비게이션 미사용 및 사이드바 세 상태 미구현 개선
priority: P1
status: todo
area: frontend
stages: [pm, design, dev, qa]
acceptance:
  - 모든 주요 화면에 오프캔버스 좌측 LNB + 상단 바 사이드바 트리거가 구현되어 있어야 한다.
  - 상단 탭 내비게이션이 사용 중인 페이지에서 제거되고, 사이드바는 데스크톱에서 펼침/레일/모바일 시트 세 상태를 모두 지원해야 한다.
  - localStorage에 사이드바 상태를 저장하고 복원하는 기능이 정상 동작해야 한다.
  - aria-controls, aria-expanded 등 접근성 속성이 올바르게 적용되어 있어야 한다.
  - Playwright 기반 자동 측정에서 상단 바 왼쪽에 사이드바 트리거가 확인되고, 사이드바 세 상태 전환이 정상 작동하는지 검증한다.
---
## 배경

frontend/index.html (상단 바 내비게이션 구조 확인)
frontend/assets/audit-navigation.js: 상단 탭 내비게이션 버튼이 존재하나, 가이드에 명시된 상단 바 왼쪽 첫 자리에 사이드바 트리거(햄버거 또는 패널 아이콘)가 없고, 탭 내비게이션이 사용되고 있음.
frontend/assets/project3-navigation.js: 사이드바 우측 패널 토글 스크립트만 존재하며, 좌측 사이드바의 세 상태(펼침, 레일, 모바일 시트) 구현 및 상태 저장 로직 부재.
프런트엔드 가이드에 따르면 상단 탭 내비게이션은 금지이며, 좌측 오프캔버스 사이드바가 유일한 1차 메뉴여야 함.

## 범위

- 상단 탭 내비게이션 UI 제거 및 관련 코드 정리
- 좌측 사이드바에 햄버거(모바일) 및 패널 아이콘(데스크톱) 트리거 추가
- 사이드바의 세 상태(펼침 248px, 레일 68px, 모바일 시트) 구현 및 localStorage 상태 저장/복원 기능 추가
- 접근성(aria-* 속성) 및 키보드 단축키(Ctrl/⌘+B, Alt+M) 지원
- 사이드바 상태에 따른 CSS Tailwind 유틸리티 클래스 적용 및 트랜지션 처리
- Playwright 기반 자동화 테스트 스크립트 작성 또는 보완

## 참고 파일

- frontend/index.html
- frontend/assets/audit-navigation.js
- frontend/assets/project3-navigation.js

## 출처

Tech Lead 에이전트 제안. 사람이 검토 후 `hermes-fleet approve <repo> <ID>`로 승인한다.
