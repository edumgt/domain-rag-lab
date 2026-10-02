# TODO — KIS 자동매매 연동 (domain-rag-lab 담당분)

> 작성일: 2026-10-02
> 3개 저장소(domain-rag-lab / lumina-invest / stock-coin-trade)를 연결해
> **시그널 → 위험관리 → KIS 실주문 → 체결 확인** 파이프라인을 구축한다.
> 이 파일은 domain-rag-lab 담당분이다. 같은 이름의 todo.md가 다른 두 저장소에도 있다.

---

## 0. 연동 방식과 실행 흐름

### 0-1. 연동 방식: 사이트 통합이 아닌 **저장소별 API 연동**

- 세 저장소는 **각자 독립 배포·독립 DB**를 유지한다. 코드나 화면을 한 저장소로 합치지 않는다.
- 저장소 간 통신은 **HTTP API만** 사용한다 (파일 공유·DB 직접 접근 없음).
  - domain-rag-lab → lumina-invest : 백테스트 결과/전략 스펙 API
  - lumina-invest → stock-coin-trade : 주문·체결조회·잔고 Open API (API Key 인증)
- 각 저장소는 자기 API의 **계약(요청/응답 스키마)과 버전**에 책임을 진다. 상대 저장소 내부 모듈을 import하지 않는다.

### 0-2. 최초 트리거: lumina-invest 웹앱 **종목 선정 화면**

자동매매는 사용자가 lumina-invest 웹앱에서 종목을 고르고 자동매매를 켜는 순간부터 시작된다.

```
[사용자] lumina-invest 웹앱 (public/app.html, public/js/quant.js)
   │  ① 퀀트 화면에서 종목 선정 + 리스크 한도 입력
   │     POST /api/stocks/quant/settings  →  BrokerSettings.quant_selected_symbols, risk_* 저장
   │  ② 자동매매 ON  (quant_mode: paper | live)
   ▼
[lumina-invest] Celery Beat 10분 주기  quant.auto_trade_cycle
   │  ③ _run_quant_cycle()  — selected_symbols 로드 (없으면 AI 상위 N종목)
   │  ④ 시그널 생성: 기술지표 + LightGBM(ml_models.py)  →  매수/매도/관망
   │  ⑤ risk_guard: kill switch → 일손실 한도 → 일 주문 수 → 종목 비중 → 쿨다운
   ▼
[stock-coin-trade] Open API  (HTTP, API Key)
   │  ⑥ POST /openapi/v1/kis/order-approval  →  60초 1회용 승인 토큰
   │  ⑦ POST /openapi/v1/kis/orders  (승인 토큰 + client_order_id)
   │       kis_request(): OAuth 토큰 서버 캐싱, 레이트리밋, 회당 주문 한도, Secrets Manager 키
   ▼
[KIS Testbed / 실전 API]  ──(주문 체결)──►  [stock-coin-trade DB 감사 로그 + 체결 기록]
   │
   │  ⑧ lumina-invest  quant.confirm_fills (1~2분 주기)  GET /openapi/v1/kis/orders/{order_no}
   ▼
[lumina-invest] 체결 반영 → 사이클 로그 → 웹앱 자동매매 현황 화면 / 알림
```

domain-rag-lab은 이 런타임 흐름의 **앞단(사전 검증)**에 위치한다. 종목 선정 화면에서 선택 가능한 전략은
domain-rag-lab LEAN 백테스트를 통과해 export된 전략 스펙만 노출한다.

### 0-3. 5단계 구조와 담당 저장소

| 단계 | 내용 | 담당 |
|------|------|------|
| 1. 신호 생성 & 검증 | LEAN Docker 백테스트 전략 검증 | **domain-rag-lab** (이 저장소) |
|  | LightGBM / 기술지표 매수·매도 시그널 생성 | lumina-invest |
| 2. 스케줄링 & 리스크 제어 | Celery Beat 10분 주기 `quant.auto_trade_cycle` | lumina-invest |
|  | 위험관리 엔진: 중복주문 쿨다운, 일손실 한도, 비상정지(Kill-Switch) | lumina-invest |
| 3. KIS 통합 주문 게이트웨이 | KIS 공통 게이트웨이 `kis_request()` | stock-coin-trade |
|  | 인증 & 보안: OAuth 토큰 서버 캐싱, AWS Secrets Manager 키 관리 | stock-coin-trade |
|  | 안전 장치: 60초 1회용 승인 토큰, 회당 주문 한도 제어 | stock-coin-trade |
| 4. KIS Testbed / 실전 API | 주문 체결 (환경 플래그로 분리) | stock-coin-trade |
| 5. DB 감사 로그 & 체결 기록 | `_audit_kis_call` 감사 로그 + `kis_orders` 체결 기록 | stock-coin-trade (lumina는 사이클 로그에 미러) |

### 0-4. 전체 작업 순서 (3개 저장소 공통)

- [ ] **Phase 0. 계약 정의** — 3개 저장소가 공유할 API 계약을 먼저 고정
  - [ ] 전략 스펙 API (domain-rag-lab → lumina-invest)
  - [ ] 승인 토큰·주문 요청/응답 스키마 (lumina-invest → stock-coin-trade)
  - [ ] 체결 조회·잔고 응답 스키마 (stock-coin-trade → lumina-invest)
- [ ] **Phase 1. 전략 확정** (domain-rag-lab) — 백테스트 통과 전략을 API로 제공
- [ ] **Phase 2. 실주문 경로 구축** (stock-coin-trade) — 모의(Testbed)부터, 실전은 플래그로 분리
- [ ] **Phase 3. 사이클 연결** (lumina-invest) — 종목 선정 화면 → 시그널 → risk_guard → 승인 토큰 → 주문 → 체결 확인
- [ ] **Phase 4. 모의 통합 테스트** — 종목 선정 화면에서 시작해 KIS Testbed 체결까지 end-to-end 1주 이상 운영
- [ ] **Phase 5. 실전 전환** — 소액·소수 종목부터, kill switch 수동 점검 후 개방

---

## 1. 현재 확인된 상태 (2026-10-02)

- LEAN 백테스트 서비스: `app/services/lean_backtest_service.py`
  - `LeanBacktestService`가 전략 소스를 `/workspace/main.py`로 쓰고 Docker(또는 SSH 원격)에서 LEAN 실행
  - 참조 데이터: `app/services/lean_reference_data/` (market-hours, symbol-properties)
- API: `app/api/routes/backtest.py` → `POST /backtest/run` (`BacktestResponse`) 1개만 존재
- lumina-invest에도 거의 동일한 `app/services/lean_backtest.py`가 있음 → **중복 구현**. 어느 쪽을 정본으로 둘지 결정 필요 (아래 미결 사항)

---

## 2. 이 저장소에서 할 일

### 2-1. 전략 스펙 계약 (Phase 0)
- [ ] `docs/strategy_spec.schema.json` 작성. 최소 필드:
  - `strategy_id`, `version`, `universe`(종목코드 6자리 배열), `timeframe`
  - `entry`/`exit` 규칙 (지표 이름·파라미터·비교 조건)
  - `position_sizing` (종목당 비중 %, 최대 종목 수)
  - `backtest_result` 요약 (기간, CAGR, MDD, 승률, 거래 수)
- [ ] lumina-invest의 시그널 엔진(`auto_trade.py`의 `indicators["signal"]`)이 그대로 소비할 수 있는 형태인지 lumina 담당과 합의

### 2-2. 백테스트 워크플로우 정비 (Phase 1)
- [ ] `main.py` 템플릿을 스펙 JSON에서 생성하는 함수 추가 (`strategy_spec → algorithm_source`)
  - 현재는 호출자가 알고리즘 소스 문자열을 직접 넘김 → 스펙 기반으로 바꿔야 lumina 시그널 규칙과 1:1 대응 가능
- [ ] 한국 주식 심볼/시장시간 매핑 점검 (`lean_reference_data/market-hours`, `symbol-properties`에 KRX 항목 유무 확인)
- [ ] 백테스트 결과 파서: LEAN 결과 JSON에서 CAGR/MDD/승률/거래 수를 추출해 `backtest_result`에 채움
- [ ] 합격 기준 정의 및 코드화 (예: MDD ≤ 20%, 거래 수 ≥ 30, 최근 1년 수익률 > 0) → 미달 시 스펙 export 거부

### 2-3. 전략 스펙 제공 API (Phase 1) — 사이트 통합 아님, lumina-invest가 HTTP로 조회
- [ ] `POST /backtest/run` 응답에 `strategy_spec` 포함 또는 별도 `POST /backtest/export` 추가
- [ ] 확정 스펙 저장소: `data/strategies/<strategy_id>_<version>.json` (내부 저장용. lumina가 직접 읽지 않음)
- [ ] 조회 API 신설 (lumina-invest 종목 선정 화면의 전략 드롭다운이 호출)
  - `GET /backtest/strategies` — 합격 전략 목록 (id, version, 요약 지표)
  - `GET /backtest/strategies/{strategy_id}` — 최신 버전 스펙 JSON
  - `GET /backtest/strategies/{strategy_id}/versions/{version}` — 특정 버전
- [ ] API Key 또는 서비스 토큰 인증 추가 (lumina-invest 서버 → domain-rag-lab 서버 간 호출)
- [ ] 스펙 변경 이력 관리 (version 증가, 이전 버전 보존, 미합격 버전은 목록에서 제외)

### 2-4. 테스트 (Phase 1·4)
- [ ] `tests/`에 스펙 → main.py 생성 단위 테스트
- [ ] 샘플 전략 1개로 Docker 백테스트 통합 테스트 (CI에서는 skip 마커)
- [ ] 백테스트 통과 전략이 lumina-invest 모의 사이클에서 동일 시그널을 내는지 교차 검증 (Phase 4)

---

## 3. 다른 저장소와의 인터페이스

- **→ lumina-invest**: `GET /backtest/strategies*` (전략 스펙 API). lumina 종목 선정 화면이 전략을 고르고, 사이클이 스펙을 받아 시그널 규칙으로 사용
- **← lumina-invest**: 실거래 체결 로그를 받아 백테스트 대비 슬리피지/체결률 분석 (Phase 5 이후, 선택)

---

## 4. 미결 사항 (결정 필요)

- [ ] LEAN 백테스트 서비스 정본을 domain-rag-lab / lumina-invest 중 어디에 둘지 (현재 양쪽 중복)
- [ ] LEAN 실행 환경: 로컬 Docker vs SSH 원격 중 운영 기준 확정

---

## 5. 개발 소요 예상 시간

> 기준: 각 저장소 코드를 아는 개발자, 하루 6시간 실작업, 영업일(d) 단위. KIS Testbed 계좌·AWS 계정은 준비되어 있다고 가정.
> 추정이므로 ±30% 여유를 둔다. 미결 사항(각 파일 4절)이 늦게 결정되면 그만큼 밀린다.

| Phase | 저장소 | 주요 작업 | 공수 |
|-------|--------|-----------|------|
| 0. 계약 정의 | 공통 | 전략 스펙·주문·체결 스키마, 에러 코드 표, 미결 사항 결정 | 2~3d |
| 1. 전략 확정 | domain-rag-lab | 스펙 스키마, 스펙→main.py 생성기, 결과 파서·합격 기준, 전략 조회 API+인증, 테스트 | 5~7d |
| 2. 실주문 경로 | stock-coin-trade | kis_request 환경 분리·tr_id 매핑 (2d), 실주문 서비스+멱등+승인 토큰 (3d), 체결 조회 (1~2d), Open API 엔드포인트+스코프 (2d), Secrets Manager 연동 (1d), 테스트 (2d) | 10~12d |
| 3. 사이클 연결 | lumina-invest | 종목 선정 화면 확장 (2~3d), 전략 로더+LightGBM 합산 (2~3d), 게이트웨이 2단계 호출 (2d), 체결 확인 태스크+live_orders (2~3d), 위험관리 보강 (2~3d), 테스트 (2d) | 12~16d |
| 4. 모의 통합 테스트 | 공통 | Testbed로 종목 선정 → 체결까지 end-to-end, 1주 관찰 + 버그 수정 | 5d 운영 관찰 + 3~5d 수정 |
| 5. 실전 전환 | 공통 | 실전 플래그·스코프 발급, 소액 운영 1주 관찰, kill switch 리허설 | 2~3d + 5d 관찰 |

### 합계

| 인원 구성 | 실작업 공수 | 캘린더 기간 |
|-----------|-------------|-------------|
| 1인이 순차 진행 | 약 **40~50 영업일** | 약 **10~12주** (관찰 기간 2주 포함) |
| 3인이 저장소별 병렬 진행 (Phase 1·2·3 동시) | 합산 공수는 동일 | 약 **6~7주** — 크리티컬 패스는 lumina-invest(Phase 3) → Phase 4 → Phase 5 |

### AI 에이전트(Claude Code) 개발 기준

> 기준: AI 에이전트가 코드 작성·테스트·마이그레이션을 수행하고, 사람은 계약 결정·코드 리뷰·자격증명 투입·실행 승인만 담당.
> 에이전트 실작업은 **세션 시간(h)**, 사람 몫은 영업일(d)로 구분. 코딩 시간은 크게 줄지만 **외부 대기와 관찰 기간은 줄지 않는다.**

| Phase | 에이전트 실작업 | 사람 몫 (결정·리뷰·승인) | 줄지 않는 대기 |
|-------|----------------|--------------------------|----------------|
| 0. 계약 정의 | 스키마·에러 코드 표 초안 1~2h | 미결 사항 결정 + 초안 검토 0.5~1d | — |
| 1. 전략 확정 (domain-rag-lab) | 스펙 스키마, main.py 생성기, 결과 파서, 조회 API, 테스트 4~6h | 리뷰 0.5d | LEAN Docker 백테스트 실행 시간 (전략당 수 분~수십 분) |
| 2. 실주문 경로 (stock-coin-trade) | 환경 분리, 실주문·멱등·승인 토큰, 체결 조회, Open API, Secrets Manager, 테스트 8~12h | 리뷰 0.5~1d, KIS/AWS 자격증명 투입 | Testbed 스모크 테스트는 장 운영시간에만 가능 |
| 3. 사이클 연결 (lumina-invest) | 종목 선정 화면 확장, 전략 로더+LightGBM 합산, 게이트웨이, 체결 확인 태스크, 위험관리 보강, 테스트 10~14h | 리뷰 1d, 화면 UX 확인 | — |
| 4. 모의 통합 테스트 | 발견 이슈 수정 누적 3~6h | 매일 사이클 로그 점검 | **Testbed 관찰 5 영업일** (장 운영시간 기준, 단축 비권장) |
| 5. 실전 전환 | 플래그·스코프·리허설 스크립트 2~3h | 실전 전환 승인, kill switch 리허설 참여 | **KIS 실전 API 승인 대기** + **소액 운영 관찰 5 영업일** |

| 구분 | 합계 |
|------|------|
| 에이전트 실작업 | 약 **28~43시간** (세션 기준 5~7 영업일) |
| 사람 몫 | 약 **3~4 영업일** (결정 1d, 리뷰 2~3d) |
| 줄지 않는 대기 | 관찰 10 영업일 + KIS 실전 승인 대기 |
| **캘린더 기간** | 약 **3.5~4.5주** (사람 기준 10~12주 대비 약 1/3) |

에이전트 기준으로 Phase 1·2·3은 **같은 날 병렬 세션**으로 돌릴 수 있어 코딩 구간은 1주 안에 끝난다.
전체 기간은 Phase 0 결정 속도와 Phase 4·5의 관찰 기간이 결정한다. 관찰을 각 3 영업일로 줄이면 약 3주까지 단축되지만, 쿨다운·일손실 한도가 실제로 작동하는 장면을 충분히 보지 못하므로 권장하지 않는다.

에이전트 작업 시 추가로 드는 비용은 사람 리뷰다. 주문·자금이 걸린 코드이므로 Phase 2·3 산출물은 **사람이 반드시 라인 단위로 리뷰**하는 것을 전제로 위 사람 몫을 잡았다.

### 기간을 좌우하는 변수
- Phase 0에서 API 계약을 확정하지 못하면 Phase 1·2·3이 병렬로 진행되지 못한다. **계약 확정이 최우선**
- lumina-invest는 기존 `KISClient` 직접 호출을 버리고 stock-coin-trade 경유로 바꾸는 작업이라, 자체 호출 유지로 결정하면 Phase 3에서 2~3d 줄어든다 (대신 stock-coin-trade의 감사 로그·승인 토큰 이점을 잃음)
- KIS 실전 API 승인(계좌 소유자 인증, 모의→실전 전환 절차)은 외부 대기 시간이라 Phase 5 시작 2주 전에 미리 신청한다
- Phase 4 관찰 중 장 휴장일이 끼면 그만큼 연장된다
