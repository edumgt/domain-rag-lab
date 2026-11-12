---
id: HX-004
title: 프런트엔드 주요 화면에서 ApexCharts CDN 버전 고정 및 로드 실패 처리 추가
priority: P1
status: todo
area: frontend
stages: [pm, design, dev, qa]
acceptance:
  - frontend/days/01.html 등 주요 화면에서 ApexCharts CDN 버전을 가이드에 맞게 4.7.0으로 고정한다.
  - CDN 로드 실패 시 사용자에게 안내 문구를 보여주고, 페이지가 깨지지 않도록 처리한다.
  - 변경 사항에 대한 테스트를 추가하여 CDN 로드 실패 시 동작을 검증한다.
---
## 배경

frontend/days/01.html 18: <script src="https://cdn.jsdelivr.net/npm/apexcharts@7.1.0"></script> 현재 ApexCharts CDN 버전이 7.1.0으로 가이드(4.7.0)와 다르며, 버전 미고정 및 로드 실패 처리도 없다. 이는 가이드 위반이며, 버전 고정과 로드 실패 대응이 필요하다.

## 범위

- ApexCharts CDN 버전을 4.7.0으로 변경
- CDN 스크립트 로드 실패 시 안내 UI 구현
- 관련 테스트 코드 작성 및 자동화

## 참고 파일

- frontend/days/01.html

## 출처

Tech Lead 에이전트 제안. 사람이 검토 후 `hermes-fleet approve <repo> <ID>`로 승인한다.
