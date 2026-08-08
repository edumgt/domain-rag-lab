# 금융상품·자산배분 RAG 에이전트

금융상품과 자산배분 방법론을 학습·탐색하기 위한 도메인 특화 RAG(Retrieval-Augmented Generation) 서비스입니다. 등록한 금융 문서를 근거로 주식·ETF·채권·파생상품의 구조와 위험을 설명하고, 포트폴리오 이론·성과지표·자산배분 모델을 대화형으로 검토합니다.

> 이 프로젝트는 금융 교육 및 분석 보조 목적의 예제입니다. 특정 상품이나 종목의 매수·매도를 권유하지 않으며, 투자 판단과 책임은 투자자 본인에게 있습니다.

## 다루는 주제

| 영역 | 주요 내용 |
|---|---|
| 금융상품 | 주식, ETF, 일반펀드, 채권, 파생상품, 배당, 금융투자상품 분류 |
| 상품 비교 | 총보수·수수료·스프레드, 유동성, 추적오차, 괴리율, 계좌 목적별 고려사항 |
| 포트폴리오 이론 | 분산투자, 상관관계, 효율적 투자선, 기대수익률과 공분산 |
| 성과·위험 분석 | CAGR, 변동성, MDD, 샤프 비율, 소르티노 비율 |
| 자산배분 | 평균-분산 최적화, 블랙-리터만, Risk Parity, 60/40·All Weather 등 사례 |
| 투자 분석 기초 | 재무제표, 밸류에이션, 거시경제, 산업 분석, 기술적 분석 |

## 주요 기능

- 금융 문서 기반 하이브리드 검색: Qdrant 벡터 검색과 PostgreSQL 키워드 검색 결과를 RRF로 결합합니다.
- 금융 교육형 응답 정책: 제공 문서 근거를 우선하며, 단정적 매매 추천 대신 상품 구조·운용 관점·위험을 설명합니다.
- 멀티턴 대화: 세션 단기 기억과 pgvector 장기 기억을 함께 활용합니다.
- 오케스트레이터: LLM이 문서 검색, 세션 이력, 장기 기억 조회 도구를 필요에 따라 호출합니다.
- 문서 수집: TXT/PDF 업로드 또는 텍스트 직접 등록 후 청킹·임베딩·저장을 수행합니다.
- Streamlit UI: 금융 도메인을 선택해 대화하고, 일반 RAG와 도구 호출 방식의 결과를 비교할 수 있습니다.

## 아키텍처

```text
사용자 / Streamlit UI
        │
        ▼
FastAPI
 ├─ POST /chat               고정 RAG: 검색 → 답변
 ├─ POST /chat/orchestrate   도구 호출 기반 오케스트레이션
 └─ POST /ingest/*           금융 문서 등록
        │
        ├─ Qdrant       금융 문서 임베딩·유사도 검색
        ├─ PostgreSQL   문서 청크, 대화 로그, 장기 기억(pgvector)
        ├─ Redis        확장용 캐시 인프라
        └─ OpenAI 호환 LLM API (vLLM 등)
```

### 응답 흐름

```text
질문
  → 금융 도메인 규칙 적용
  → 벡터 검색 + 키워드 검색(RRF 병합)
  → 세션/장기 기억 결합
  → LLM 답변
  → 근거 문서 및 투자 유의사항 제공
```

`/chat/orchestrate`는 위 흐름에서 LLM이 다음 도구를 선택적으로 호출합니다.

| 도구 | 용도 |
|---|---|
| `search_documents` | 금융 문서 청크를 하이브리드 검색 |
| `get_session_history` | 같은 세션의 최근 대화 확인 |
| `get_long_term_memory` | 의미적으로 유사한 과거 대화·기억 조회 |

## 빠른 시작

### 1. 사전 조건

- Docker 및 Docker Compose
- OpenAI 호환 Chat Completions API를 제공하는 LLM 서버(vLLM, LM Studio, Ollama 등)

`docker-compose.yml`은 이 저장소 전용 PostgreSQL(pgvector)·Redis·Qdrant를 함께 실행합니다. 다른 프로젝트의 컨테이너나 외부 Docker 네트워크는 필요하지 않습니다.

| 서비스 | 컨테이너 이름 | 내부 포트 |
|---|---|---:|
| PostgreSQL | `postgres` 서비스 | 5432 |
| Redis | `redis` 서비스 | 6379 |
| Qdrant | `qdrant` 서비스 | 6333 |

PostgreSQL 초기화 시 [init.sql](/home/ubuntu/domain-rag-lab/init.sql)이 자동 실행되어 pgvector 확장이 활성화됩니다.

### 2. 환경 변수 설정

프로젝트 루트에 `.env`를 만들고 LLM 및 필요 시 데이터베이스 설정을 입력합니다.

```env
# OpenAI 호환 LLM API
VLLM_BASE_URL=http://host.docker.internal:8001/v1
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VLLM_API_KEY=EMPTY

# 아래 값은 기본값과 다를 때만 지정
POSTGRES_DB=ragdb
POSTGRES_USER=raguser
POSTGRES_PASSWORD=ragpass
QDRANT_COLLECTION=domain_docs
EMBEDDING_MODEL=hashing-384
```

오케스트레이터를 쓰려면 LLM 서버와 모델이 Function/Tool Calling을 지원해야 합니다.

### 3. 실행

```bash
docker compose up --build -d
```

| 서비스 | 주소 |
|---|---|
| Streamlit UI | http://localhost:8290 |
| FastAPI | http://localhost:8190 |
| API 문서 | http://localhost:8190/docs |
| 상태 확인 | http://localhost:8190/health |
| Qdrant 대시보드 | http://localhost:6335/dashboard |
| PostgreSQL (호스트 접속) | `localhost:15433` |
| Redis (호스트 접속) | `localhost:6380` |

처음 실행할 때는 임베딩 모델 초기화 때문에 API가 준비 상태가 되기까지 잠시 걸릴 수 있습니다. 다음 명령으로 상태를 확인합니다.

```bash
docker compose ps
curl http://localhost:8190/health
```

로컬에서 UI만 실행할 때는 API 주소를 지정할 수 있습니다.

```bash
pip install -r requirements.txt
API_BASE_URL=http://localhost:8190 streamlit run streamlit_app.py
```

## 금융 지식 베이스 준비

기본 샘플은 `data/samples/finance_*.txt`에 포함되어 있습니다. 금융상품 분류, ETF 심화, 포트폴리오 이론, 자산배분 모델, 성과 분석, 재무제표·밸류에이션 자료를 한 번에 등록하려면 다음을 실행하세요.

```bash
for f in ./data/samples/finance_*.txt; do
  curl -X POST http://localhost:8190/ingest/file \
    -F "file=@${f}" \
    -F "domain=finance"
done
```

등록 가능한 파일 형식은 TXT와 PDF입니다. UI의 사이드바에서도 업로드하거나 텍스트를 직접 등록할 수 있습니다.

### 핵심 샘플 문서

| 파일 | 활용 예 |
|---|---|
| `finance_financial_products_classification.txt` | 금융투자상품 분류, 주식·ETF·펀드 기초 |
| `finance_etf_deep_dive.txt` | 일반펀드와 ETF의 비용·유동성·추적오차 비교 |
| `finance_portfolio_theory.txt` | MPT, 효율적 투자선, CAGR·MDD·샤프 비율 |
| `finance_asset_allocation.txt` | 평균-분산, 블랙-리터만, Risk Parity, 자산배분 사례 |
| `finance_stock_dividend_basics.txt` | 주식·배당 및 금융상품 기초 |
| `finance_valuation_multiples.txt` | PER·PBR 등 상대가치 평가 |

## 사용 예시

### 금융상품 비교

```bash
curl -X POST http://localhost:8190/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "일반펀드와 ETF를 비교할 때 비용과 유동성 측면에서 확인할 항목을 정리해 주세요.",
    "domain": "finance",
    "session_id": "finance-study-001",
    "top_k": 4
  }'
```

### 자산배분 질의

```bash
curl -X POST http://localhost:8190/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "60/40 포트폴리오와 Risk Parity의 차이를 위험 기여도 관점에서 설명해 주세요.",
    "domain": "finance",
    "session_id": "allocation-study-001"
  }'
```

### 직접 문서 등록

```bash
curl -X POST http://localhost:8190/ingest/text \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "allocation-policy-v1",
    "title": "자산배분 정책 초안",
    "content": "투자 목적, 투자 기간, 허용 가능한 손실 범위, 리밸런싱 기준을 기록합니다.",
    "domain": "finance"
  }'
```

## API 요약

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/health` | 서비스 상태 확인 |
| `POST` | `/ingest/text` | 텍스트 문서 등록 |
| `POST` | `/ingest/file` | TXT/PDF 문서 업로드·등록 |
| `POST` | `/chat` | 고정 RAG 파이프라인 질의 |
| `POST` | `/chat/orchestrate` | 도구 호출 기반 질의 |

`domain`에는 `finance`를 지정합니다. 구현상 `general`, `medical`, `english`도 선택할 수 있지만, 이 저장소의 주된 지식 베이스와 사용 목적은 금융상품 및 자산배분입니다.

## Streamlit UI

UI에서 도메인을 `금융·투자`로 선택한 뒤 다음 기능을 사용할 수 있습니다.

- 오케스트레이터 채팅: 문서 검색·대화 기억 도구의 호출 이력까지 확인
- 결과 리포트: 반복 횟수, 호출 도구, 도구별 입력·결과 미리보기 확인
- 일반 RAG 채팅: Top-K를 조정하고 검색된 참고 문서를 확인
- 문서 등록: 금융 리서치, 상품 설명서, 자산배분 정책 등 TXT/PDF 추가

질문 예시는 다음과 같습니다.

- “ETF의 총보수, 스프레드, 추적오차는 각각 왜 확인해야 하나요?”
- “변동성과 MDD의 차이, 그리고 샤프 비율을 함께 보는 이유를 설명해 주세요.”
- “평균-분산 최적화와 블랙-리터만 모델의 입력값과 한계를 비교해 주세요.”
- “리밸런싱 규칙을 정할 때 비중 기준과 시간 기준의 장단점은 무엇인가요?”

## 프로젝트 구조

```text
.
├── app/
│   ├── api/routes/        # chat, ingest, health API
│   ├── core/              # 환경 설정 및 DB 연결
│   ├── models/            # 채팅 로그·문서 청크·장기 기억 모델
│   ├── services/          # RAG, 검색, 임베딩, 오케스트레이터
│   └── main.py
├── data/
│   ├── samples/           # 금융상품·자산배분 샘플 문서
│   └── uploads/           # 업로드 파일 저장 경로
├── frontend/              # 기본 정적 프론트엔드
├── streamlit_app.py       # 데모 UI
├── docker-compose.yml
├── Dockerfile
├── init.sql               # pgvector 확장 초기화
└── requirements.txt
```

## 기술 스택

FastAPI · Streamlit · Qdrant · PostgreSQL/pgvector · Redis · sentence-transformers · OpenAI 호환 LLM API · Docker Compose

## 유의사항

- 응답 품질은 등록 문서의 최신성·정확성·메타데이터에 직접 좌우됩니다. 상품설명서, 운용보고서, 자산배분 정책 등은 최신 버전으로 관리하세요.
- 이 애플리케이션은 실시간 시세·공시·세법·규제 변경을 자동으로 조회하지 않습니다. 최신 정보가 필요한 판단은 원문과 공식 공시를 별도로 확인해야 합니다.
- 특정 투자자에게 적합한 상품이나 비중을 자동으로 산정·보증하지 않습니다. 투자 목적, 기간, 위험 감수 수준, 유동성 필요를 바탕으로 별도의 검토가 필요합니다.
