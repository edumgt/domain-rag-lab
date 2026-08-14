# 팀단위로 이 시스템을 AWS 클라우드 기반으로 이관하고, 다음의 내용을 학습한다.

## AWS 계정 설정, AWS CLI, IAM, EC2, 이 repo 이관

## 퀀트를 위한 금융 필수 지식	
- 금융상품 이해: 주식/ETF 상품(주식/ETF 개요 및 운용 전략), 채권 상품(채권 개요 및 운용 전략), 파생상품(파생상품 개요 및 운용 전략) 
- 자산배분방법론: 포트폴리오 이론(개요 및 성과분석, 리스크 지표), 자산배분 모델(평균분산, 블랙리터만, Risk-Parity 모델 설명), 사례 분석 실습
> 40 시간

# 금융상품·자산배분 RAG 에이전트

금융상품과 자산배분 방법론을 학습·탐색하기 위한 도메인 특화 RAG(Retrieval-Augmented Generation) 서비스입니다. 등록한 금융 문서를 근거로 주식·ETF·채권·파생상품의 구조와 위험을 설명하고, 포트폴리오 이론·성과지표·자산배분 모델을 대화형으로 검토합니다.

## 병행하는 AWS 인프라 저장소

이 애플리케이션 저장소는 AWS 인프라 학습·설정 저장소인 [aws-ec2-alb-lab](/home/ubuntu/aws-ec2-alb-lab/README.md)과 병행합니다. `domain-rag-lab`에서는 RAG·LEAN 기능과 Docker 실행 구성을 관리하고, `aws-ec2-alb-lab`에서는 EC2·VPC·보안 그룹·ALB·ECS/ECR 등 AWS 배포 구조와 점검 절차를 관리합니다.

현재 단일 AWS EC2 운영은 이 저장소의 `docker-compose.prod.yml`과 Caddy 구성을 따릅니다. ALB, 고가용성, ECS/Fargate 또는 EKS로 확장할 때는 `aws-ec2-alb-lab`의 EC2·LB·ECS 실습 문서를 기준으로 네트워크와 배포 구성을 함께 점검합니다. 두 저장소의 환경 파일·PEM 키·AWS 자격 증명은 서로 공유하거나 Git에 커밋하지 않습니다.

> 이 프로젝트는 금융 교육 및 분석 보조 목적의 예제입니다. 특정 상품이나 종목의 매수·매도를 권유하지 않으며, 투자 판단과 책임은 투자자 본인에게 있습니다.

## 핵심 실습 목표

이 저장소의 주요 실습은 두 가지입니다.

1. **AI Hub 등 데이터 소스를 활용한 RAG 구축**: 금융·금융법률 데이터의 이용 조건을 확인하고, 허용된 원문을 정제·청킹·메타데이터화하여 근거 중심 질의응답을 만듭니다.
2. **QuantConnect LEAN 백테스트 웹앱 제작**: yfinance 일봉과 원격 LEAN Docker 엔진을 연결해 종목·기간·비교 기간을 입력하고 수익률·최대낙폭을 워크플로우 UI로 확인합니다.

두 실습 모두 출처·라이선스·기준일을 기록하고, 백테스트 결과를 투자 권유나 법률 자문으로 해석하지 않는 것을 원칙으로 합니다.

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

### 실행 환경 구분

| 환경 | 대상 | Compose 파일 | 환경 파일 | 공개 방식 |
|---|---|---|---|---|
| Local | 내 PC 개발 | `docker-compose.yml` | `.env.local` | API·Streamlit·DB·Qdrant 포트를 로컬에 공개, 코드 핫리로드 |
| Production | AWS EC2 운영 | `docker-compose.prod.yml` | `.env.prod` | Caddy를 통한 80/443만 공개, 데이터 서비스는 내부 네트워크 |

로컬과 AWS의 환경 파일, 데이터 볼륨, Compose 프로젝트 이름은 분리되어 있습니다. `.env.local`, `.env.prod`, PEM 키는 모두 Git에 포함되지 않습니다.

### 1. 사전 조건

- Docker 및 Docker Compose
- OpenAI 호환 Chat Completions API를 제공하는 LLM 서버(vLLM, LM Studio, Ollama 등)

`docker-compose.yml`은 내 PC 개발 전용 설정입니다. 이 저장소 전용 PostgreSQL(pgvector)·Redis·Qdrant를 함께 실행하며, 다른 프로젝트의 컨테이너나 외부 Docker 네트워크는 필요하지 않습니다.

| 서비스 | 컨테이너 이름 | 내부 포트 |
|---|---|---:|
| PostgreSQL | `postgres` 서비스 | 5432 |
| Redis | `redis` 서비스 | 6379 |
| Qdrant | `qdrant` 서비스 | 6333 |

PostgreSQL 초기화 시 [init.sql](/home/ubuntu/domain-rag-lab/init.sql)이 자동 실행되어 pgvector 확장이 활성화됩니다.

### 2. 내 PC에서 실행 (Local)

로컬 템플릿을 복사해 개인 PC의 LLM 주소와, 필요하다면 AWS LEAN 접속 정보를 입력합니다.

```bash
cp .env.local.example .env.local
# .env.local 편집
docker compose --env-file .env.local -f docker-compose.yml up --build -d
```

오케스트레이터를 쓰려면 LLM 서버와 모델이 Function/Tool Calling을 지원해야 합니다. 로컬에서 LEAN을 쓰지 않을 경우 `LEAN_SSH_HOST`와 키 경로는 비워 두면 백테스트 API가 안전하게 비활성화됩니다.

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
docker compose --env-file .env.local -f docker-compose.yml ps
curl http://localhost:8190/health
```

로컬에서 UI만 실행할 때는 API 주소를 지정할 수 있습니다.

```bash
pip install -r requirements.txt
API_BASE_URL=http://localhost:8190 streamlit run streamlit_app.py
```

### 5일 이론 페이지

5일 이론은 기존 FastAPI 프런트엔드의 정적 자산으로 제공됩니다. 메인 화면의 **5일 이론** 메뉴를 누르거나, `http://localhost:8190/static/theory/01.html`처럼 일차별 URL로 바로 접속할 수 있습니다. 별도 컨테이너나 Compose 서비스는 필요하지 않습니다.

| 일자 | 학습 흐름 | 핵심 내용 |
|---|---|---|
| 1일차 | 금융상품과 계약의 기초 | 현물·선물·옵션, 주문 매칭과 거래소·청산기관, 콜·풋, 프리미엄·증거금, 만기·청산 |
| 2일차 | 상품 비교와 거래 구조 | 펀드·ETF·리츠·ETN, ETF 기초자산·파생상품 ETF, 레버리지 ETF의 선물·스왑 활용과 일일 재설정, NAV·iNAV·괴리율, 숏 포지션, 거래소·청산기관 |
| 3일차 | 금리와 실제 거래 준비 | 채권·금리, 파생상품의 목적과 위험, 사전교육·모의거래·기본예탁금 |
| 4일차 | 위험 측정과 관리 | 퀀트의 데이터·규칙·검증 관점, 에드워드 소프 교수·제임스 사이먼스·HMM·벰버거의 사례, 분산·변동성·옵션 체인, 헤지, 증거금·마진콜·강제청산, MDD·샤프 비율 |
| 5일차 | 포트폴리오 적용 | 이머징마켓의 개념·위험 요인, 선물·옵션과 현물시장의 연결, 시장 심리, 자산배분·리밸런싱·LEAN 점검 |

1일차는 “선물 1계약의 매도 주문과 1계약의 매수 주문이 체결되면 계약이 생긴다”는 수준부터 설명합니다. 현물 주식처럼 기업 지분을 사는 것이 아니라, 기준 대상의 가격 변화에 따른 손익을 정산하는 표준 계약이라는 점을 다룹니다. 이후 2일차에서 거래소·청산기관과 익명의 반대편 거래자 구조, 헤지·투기·차익거래의 차이를 확장합니다.

### 전체 TXT 학습 자료 HTML 라이브러리

기존 5일 이론 화면은 그대로 유지합니다. `data/samples/finance_*.txt`의 전체 원문은 별도 학습 화면인 `http://localhost:8190/static/learning/index.html`에서 확인합니다. 이 화면은 서버에서 TXT 목록과 원문을 직접 읽으므로, 새 TXT 파일을 추가하거나 기존 파일을 수정한 뒤 새로고침하면 별도의 HTML 복사 작업 없이 학습 화면에 반영됩니다.

### 선물·옵션 교육용 시뮬레이터

메인 프런트엔드의 **자산배분 실습**에는 교육용 선물·풋옵션 헤지 모듈이 포함되어 있습니다.

- 포트폴리오 금액, 가정 지수 수준, 지수선물 매도 계약 수를 입력합니다.
- 주식/ETF 노출 중 풋옵션으로 보호할 비중과 권리금 가정을 설정합니다.
- 주식 급락·금리 급등·인플레이션 시나리오에서 현물 포트폴리오, 선물, 풋옵션의 손익을 분리해 보여 줍니다.
- 콜·풋 옵션 체인 샘플 화면에서 행사가, 프리미엄, IV(내재변동성), OI(미결제약정)를 읽는 법을 설명합니다.

이 모듈과 옵션 체인 표의 숫자는 학습을 위한 가정값입니다. 실시간 시세·호가·옵션가격·만기·증거금·수수료·세금·개별 상품의 거래 제약을 반영하지 않으며, 매매 신호나 투자 권유가 아닙니다.

### 3. AWS EC2에서 실행 (Production)

AWS 서버에서만 아래 명령을 실행합니다. 운영 Compose는 소스 바인드 마운트와 `--reload`를 쓰지 않고, PostgreSQL·Redis·Qdrant 포트를 외부에 노출하지 않습니다. 웹 트래픽은 Caddy가 FastAPI의 프론트엔드와 API로 전달합니다.

```bash
cp .env.prod.example .env.prod
# .env.prod에서 강한 PostgreSQL 비밀번호, LLM 주소, 서버 내 PEM 경로를 설정
chmod 600 /home/ubuntu/.ssh/pr-test.pem
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

운영 전 확인 사항:

- AWS 보안 그룹에는 웹 공개가 필요할 때만 TCP 80/443을 허용합니다. PostgreSQL(5432), Redis(6379), Qdrant(6333/6334)는 열지 않습니다.
- [Caddyfile](/home/ubuntu/domain-rag-lab/Caddyfile)의 도메인이 EC2의 공인 IP 또는 로드밸런서를 가리키도록 DNS를 설정합니다.
- AWS 서버에서 LEAN 컨테이너를 실행하는 경우 `.env.prod`의 `LEAN_SSH_HOST=host.docker.internal`을 사용하면 API 컨테이너가 같은 EC2 호스트의 SSH와 Docker에 연결합니다. 별도 LEAN 서버를 둘 때만 private IP 또는 private DNS로 바꿉니다. PEM 파일은 서버에만 두고 읽기 전용으로 마운트됩니다.
- 배포 갱신은 `docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d`로 수행합니다.

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

### QuantConnect LEAN 백테스트 워크플로우

상단의 **LEAN 백테스트** 메뉴는 종목·백테스트 기간·비교 기간을 입력받아 yfinance 일봉을 정리하고, 환경변수로 지정한 원격 서버의 `quantconnect/lean:latest` 컨테이너를 호출합니다. 내 PC에서는 `.env.local`, AWS에서는 `.env.prod`에 `LEAN_SSH_HOST`, `LEAN_SSH_USER`, `LEAN_SSH_KEY_HOST_PATH`, `LEAN_SSH_KEY_PATH`을 설정하세요. PEM 키는 저장소에 추가하지 않고 호스트의 절대 경로를 읽기 전용으로 마운트합니다.

결과는 교육용 매수·보유 예시입니다. 데이터 품질, 배당, 세금, 수수료, 슬리피지와 실제 체결은 별도 검토가 필요합니다.

### 핵심 샘플 문서

| 파일 | 활용 예 |
|---|---|
| `finance_high_school_product_guide.txt` | 고등학생 눈높이의 예금·채권·주식·ETF·펀드·파생상품 설명 |
| `finance_financial_products_classification.txt` | 금융투자상품 분류, 주식·ETF·펀드 기초 |
| `finance_etf_deep_dive.txt` | 일반펀드와 ETF의 비용·유동성·추적오차 비교 |
| `finance_portfolio_theory.txt` | MPT, 효율적 투자선, CAGR·MDD·샤프 비율 |
| `finance_asset_allocation.txt` | 평균-분산, 블랙-리터만, Risk Parity, 자산배분 사례 |
| `finance_stock_dividend_basics.txt` | 주식·배당 및 금융상품 기초 |
| `finance_valuation_multiples.txt` | PER·PBR 등 상대가치 평가 |
| `finance_quantopian_intro.txt` | 퀀토피안의 역사적 역할, Zipline 등 오픈소스 도구, LEAN과의 차이와 백테스트 유의사항 |
| `finance_lending_sectors_guide.txt` | 제1·2금융권, 등록 대부업·사적 대출의 등록·규율·보호 범위 학습 |
| `finance_aihub_rag_case.txt` | AI Hub 금융·법률 데이터를 정제·청킹·메타데이터화하여 RAG에 등록하는 사례 |

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
