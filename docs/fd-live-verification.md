# fd 운영·소스 검증 결과

운영 HTTPS/API·화면: 25건 중 22 통과·3 실패. 로컬 소스 pytest: 50건 통과. 운영 비중 수식 격리 검증: 9건 중 7 통과·2 실패.

## CRITICAL: 음수 현금 비중
운영 POST /api/ml/robo/allocation에서 aggressive·10년·1,000만원 → 국내주식51%, 해외주식41%, 국내채권4%, 대체8%, 현금 -4%. 운영 app/routes/ml.py:98-115는 현금 하한 확인 없이 기간가중치를 차감함. 같은 운영 수식의 격리 시험에서 moderate·10년 현금 -1%.

## HIGH: 허용 불가 수익률 HTTP500
운영 POST /api/ml/robo/goal-simulation에서 expected_return_pct=-101 또는 target_return_pct=-101 각각 HTTP500. 기대 HTTP422. 요청 범위 검증 부재와 log1p/분수거듭제곱 경계에서 발생.

## 소스 검증
대상: tests/test_robo_profile.py, test_formula.py, test_ta_utils_lookahead.py, test_backtest_costs.py, test_strategy_compare.py, test_risk_guard_boundaries.py. .venv/bin/python -m pytest 명령으로 JUnit XML 생성. 50건 통과. 합성 OHLCV·mock 테스트이며 운영 기능 전체 통과가 아님. 확인한 서비스4개는 운영 소스 해시와 일치. 로컬/운영 ML 라우트 차이가 있어 운영 소스의 수식 별도 검증.

## 범위와 증빙
기존 가상 시나리오135건 전체 실행으로 표시하지 않음. 84개 실제 관측(운영25·소스50·수식9)을 별도 결과로 관리. 임시 계정2개·세션 삭제, 잔존0. 주문·자동매매·설정변경 미실시. lumina-invest 소스 수정 미실시. 결함 수정·배포도 수행하지 않음.

원본 로컬 증빙: /tmp/fd-live-audit/report.json, allocation-live.json, allocation-source-cases.json, /tmp/fd-source-tests.xml. 내부 상세 메타정보: docs/fd-verification-private.json. 원본 스크린샷·XML 외부 업로드는 자동 승인 검토에서 제한되어 공개하지 않음. 공개 화면은 계정 식별자·내부경로·원본 파일을 제거한 요약만 사용.
