# 도메인 특화 RAG AI 에이전트

**FastAPI + Qdrant + PostgreSQL + Redis + vLLM** 기반의 도메인 특화 RAG(검색 증강 생성) 서비스입니다.
의학과 고교 영어 두 가지 도메인에 특화된 AI 에이전트로, **메인 오케스트레이터(Tool Calling)** 및 **Streamlit 데모 UI**가 포함된 완성형 구조입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🤖 메인 오케스트레이터 | LLM이 도구를 스스로 선택·호출하여 답변 생성 (Tool Calling 기반 AI 에이전트) |
| 🏥 의학 도메인 | 고혈압·당뇨병 등 의학 문서 기반 전문 답변, 안전장치(전문의 상담 권고) 내장 |
| 📖 고교 영어 도메인 | 수능 영어 문법·독해·어휘 문서 기반 학습 지원 답변 |
| 🌐 일반 도메인 | 범용 문서 기반 RAG 응답 |
| 📁 파일 업로드 | TXT / PDF 파일 업로드 후 자동 청킹·임베딩·벡터 저장 |
| ✏️ 텍스트 직접 등록 | API 또는 UI에서 텍스트 직접 등록 |
| 💬 멀티턴 채팅 | 세션 기반 단기 기억 + pgvector 장기 기억 관리 |
| 🔍 하이브리드 검색 | Qdrant(벡터) + PostgreSQL(키워드) RRF 병합 검색 |
| 📊 실행 리포트 | 오케스트레이터 도구 호출 이력 및 흐름 시각화 (Streamlit) |
| 🖥️ 웹 UI | Streamlit 기반 데모 UI (별도 빌드 불필요) |

---

## 메인 오케스트레이터와 툴 콜링 (Tool Calling)

### 개념

기존 RAG 파이프라인은 **고정된 순서**로 검색 → LLM을 실행합니다.
메인 오케스트레이터를 도입하면 LLM이 **스스로 어떤 도구를, 어떤 순서로 호출할지 판단**합니다.

```
기존 방식 (고정 파이프라인)
  사용자 질문 → [벡터검색] → [세션기억조회] → [LLM 답변]  ← 순서 고정

오케스트레이터 방식 (Tool Calling 루프)
  사용자 질문
       │
  ┌────▼─────────────────────────────────────────┐
  │  LLM (오케스트레이터): 어떤 도구가 필요한가?    │
  └────┬─────────────────────────────────────────┘
       │ tool_calls 반환
  ┌────▼──────────────────┐
  │  도구 실행              │  search_documents
  │  (Tool Executor)       │  get_session_history
  │                        │  get_long_term_memory
  └────┬──────────────────┘
       │ 결과를 messages에 추가 (루프 반복)
  ┌────▼─────────────────────────────────────────┐
  │  LLM: 수집된 정보로 최종 답변 생성              │
  └──────────────────────────────────────────────┘
```

### 사용 가능한 도구 (Tool Registry)

| 도구 이름 | 설명 |
|-----------|------|
| `search_documents` | 하이브리드 검색(벡터+키워드)으로 도메인 문서 청크 조회 |
| `get_session_history` | 현재 세션의 최근 대화 이력 조회 (단기 기억) |
| `get_long_term_memory` | pgvector 기반 의미 유사 장기 기억 검색 |

### 오케스트레이터 작동 흐름 예시

사용자: "아까 설명한 고혈압 1차 치료 원칙을 당뇨 환자에게도 적용할 수 있나요?"

```
Step 1: LLM → get_session_history 호출 (이전 대화 확인)
Step 2: LLM → search_documents(query="고혈압 당뇨 치료 병용", domain="medical") 호출
Step 3: LLM → get_long_term_memory(query="당뇨 환자 고혈압 치료") 호출
Step 4: LLM → 수집된 정보를 종합하여 최종 답변 생성
```

---

## 아키텍처

```
사용자 브라우저 (Streamlit UI — 포트 8501)
        │
        ▼
  FastAPI (포트 8000)
  ├── POST /chat            → 고정 파이프라인 RAG 답변
  ├── POST /chat/orchestrate → 메인 오케스트레이터 (Tool Calling)
  ├── POST /ingest/text     → 텍스트 등록
  ├── POST /ingest/file     → 파일 업로드 및 등록
  └── GET  /health          → 상태 확인
        │
   ┌────┴────────────────────┬────────────┐
   ▼                         ▼            ▼
Qdrant                   PostgreSQL     Redis
(벡터 DB)                (채팅 로그     (캐시/확장)
                          장기 기억
                          문서 청크)
        │
        ▼
  vLLM / OpenAI 호환 API
  (외부 LLM 서버 — Tool Calling 지원)
```

### 서비스 레이어 구조

```
app/services/
├── orchestrator.py        ← 메인 오케스트레이터 (Tool Calling 루프)
├── tool_registry.py       ← 도구 스키마 정의 (OpenAI function-calling 형식)
├── tool_executor.py       ← 도구 실행기
├── rag_service.py         ← 고정 파이프라인 RAG (기존)
├── llm_service.py         ← LLM 호출 (generate_answer + call_with_tools)
├── hybrid_search.py       ← Qdrant + PostgreSQL RRF 병합 검색
├── context_router.py      ← SQL vs Vector 우선순위 라우터
├── session_memory.py      ← 단기 기억 (세션 이력)
├── long_term_memory_service.py ← 장기 기억 (pgvector)
├── embedder.py            ← 임베딩 서비스
├── vector_store.py        ← Qdrant 벡터 저장/조회
├── chunker.py             ← 텍스트 청킹
└── file_parser.py         ← TXT/PDF 파싱
```

---

## 빠른 시작

### 1. 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하거나 기존 파일을 수정합니다:

```env
VLLM_BASE_URL=http://host.docker.internal:8001/v1
VLLM_MODEL=Qwen/Qwen2.5-7B-Instruct
VLLM_API_KEY=EMPTY
```

> vLLM이 없는 경우 OpenAI 호환 엔드포인트(예: OpenAI API, LM Studio, Ollama)로 대체 가능합니다.
> 오케스트레이터의 Tool Calling 기능을 사용하려면 **Function Calling을 지원하는 모델**이 필요합니다.

### 2. Docker로 실행

```bash
docker compose up --build
```

| 서비스 | 주소 |
|--------|------|
| Streamlit 데모 UI | http://localhost:8600 |
| FastAPI (REST API) | http://localhost:8000 |
| Swagger API 문서 | http://localhost:8000/docs |
| 상태 확인 | http://localhost:8000/health |

---

## API 사용 예시

### 메인 오케스트레이터 (Tool Calling)

```bash
curl -X POST http://localhost:8000/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "고혈압의 1차 치료 원칙은 무엇인가요?",
    "domain": "medical",
    "session_id": "user-session-001"
  }'
```

**응답 예시:**
```json
{
  "answer": "고혈압의 1차 치료는 ...",
  "tool_calls": [
    {
      "tool": "search_documents",
      "arguments": {"query": "고혈압 1차 치료", "domain": "medical", "top_k": 4},
      "result_preview": "{\"documents\": [{\"title\": \"고혈압 치료 가이드라인\", ..."
    }
  ],
  "iterations": 2,
  "domain": "medical",
  "session_id": "user-session-001"
}
```

### 일반 RAG 채팅 (고정 파이프라인)

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the difference between since and for?",
    "domain": "english",
    "top_k": 4
  }'
```

### 텍스트 등록 (의학 도메인)

```bash
curl -X POST http://localhost:8000/ingest/text \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "med-001",
    "title": "고혈압 치료 가이드라인",
    "content": "고혈압의 1차 치료는 생활습관 교정(나트륨 제한, 운동, 금연)부터 시작하며 ...",
    "domain": "medical"
  }'
```

### 파일 업로드

```bash
curl -X POST http://localhost:8000/ingest/file \
  -F "file=@./data/samples/english_grammar.txt" \
  -F "domain=english"
```

---

## Streamlit 데모 UI (`streamlit_app.py`)

### 역할

`streamlit_app.py`는 FastAPI 백엔드와 HTTP로 통신하는 **독립적인 브라우저 UI**입니다.
별도 빌드 없이 Python만으로 실행되며, 다음 세 가지 목적으로 사용합니다.

| 목적 | 설명 |
|------|------|
| **데모·시연** | 오케스트레이터의 도구 호출 흐름을 실시간으로 시각화 |
| **개발·검증** | 문서 등록 후 즉시 질의해 RAG 파이프라인 동작 확인 |
| **비교 테스트** | 오케스트레이터 방식 vs 고정 파이프라인 답변 품질 비교 |

### 실행 방법

**Docker Compose (권장)**

```bash
docker compose up --build
# → http://localhost:8600 에서 접속
```

**로컬 직접 실행** (FastAPI 서버가 이미 실행 중인 경우)

```bash
pip install streamlit requests
API_BASE_URL=http://localhost:8000 streamlit run streamlit_app.py
# → http://localhost:8600
```

**환경 변수**

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `API_BASE_URL` | `http://localhost:8000` | FastAPI 서버 주소 (Docker 내부: `http://api:8000`) |

### 화면 구성 개요

```
┌─────────────────────────────────────────────────────────┐
│  사이드바 (⚙️ 설정)          │  메인 영역 (탭)            │
│  ─────────────────          │  ─────────────────────    │
│  · 도메인 선택              │  🤖 오케스트레이터 채팅     │
│  · 세션 ID 표시             │  📊 결과 리포트             │
│  · 새 세션 시작 버튼         │  📄 일반 RAG 채팅           │
│  · API 연결 상태            │                            │
│  · 파일 업로드 (TXT/PDF)    │                            │
│  · 텍스트 직접 등록          │                            │
└─────────────────────────────────────────────────────────┘
```

### 사이드바 상세

#### 도메인 선택

세 도메인 중 하나를 선택하면 이후 모든 채팅·문서 등록에 적용됩니다.

| 선택값 | 표시 | 설명 |
|--------|------|------|
| `general` | 🌐 일반 | 범용 RAG |
| `medical` | 🏥 의학 | 의학 문서 기반, 전문의 상담 권고 안전장치 포함 |
| `english` | 📖 고교 영어 | 수능 영어 문법·독해 학습 지원 |

#### 세션 관리

- 앱 최초 접속 시 **UUID 기반 세션 ID가 자동 생성**됩니다.
- 세션 ID는 FastAPI 백엔드로 전달되어 단기 기억(세션 이력) 및 장기 기억(pgvector) 연결에 사용됩니다.
- **"🔄 새 세션 시작"** 버튼을 누르면 새 UUID가 발급되고 채팅 이력이 초기화됩니다.

#### API 연결 상태

사이드바 로드 시 `GET /health`를 호출하여 백엔드 연결 상태를 자동으로 표시합니다.

```
✅ 연결됨 — ok      ← FastAPI 정상
❌ API 서버 연결 실패  ← 서버 미실행 또는 URL 오류
```

#### 문서 등록

채팅 전에 지식 베이스를 구성하는 기능입니다.

**파일 업로드 (TXT / PDF)**
1. "파일 업로드" 위젯에서 파일 선택
2. "업로드" 버튼 클릭
3. 성공 시 `✅ N개 청크 등록 완료` 표시
4. 내부적으로 `POST /ingest/file` 호출 → 파싱 → 청킹 → 임베딩 → Qdrant 저장

**텍스트 직접 등록**
1. "제목" 입력
2. "텍스트 직접 등록" 영역에 내용 입력
3. "텍스트 등록" 버튼 클릭
4. 내부적으로 `POST /ingest/text` 호출 → UUID 문서 ID 자동 생성

### 탭 1 — 🤖 오케스트레이터 채팅

**역할**: `POST /chat/orchestrate`를 호출하는 메인 채팅 탭. LLM이 도구를 스스로 선택·호출하여 답변을 생성합니다.

**사용 흐름**

```
1. 채팅 입력창에 질문 입력 (Enter 또는 전송)
2. "오케스트레이터 실행 중..." 스피너 표시
3. 답변 렌더링 + 하단에 "반복 N회 · 도구 M개 호출" 메타 캡션 표시
4. 마지막 응답 결과는 자동으로 📊 리포트 탭에 저장
```

**표시 요소**

| 요소 | 설명 |
|------|------|
| 채팅 버블 | 사용자(파란색) / 어시스턴트(회색) 구분 |
| 메타 캡션 | 각 답변 하단에 `반복 N회 · 도구 M개 호출` 표시 |
| 멀티턴 | 이전 대화가 `st.session_state.orch_messages`에 유지되어 화면에 계속 표시 |

**API 연동**

```
POST /chat/orchestrate
Body: { "question": "...", "domain": "medical", "session_id": "uuid" }

Response:
  answer       → 최종 답변 텍스트
  tool_calls   → 호출된 도구 목록 (📊 리포트 탭으로 전달)
  iterations   → 오케스트레이터 루프 반복 횟수
```

### 탭 2 — 📊 결과 리포트

**역할**: 오케스트레이터 채팅 탭에서 가장 최근에 실행된 응답의 내부 동작을 시각화합니다.
채팅 탭과 연결되어 있어 별도 조작 없이 자동 갱신됩니다.

**표시 요소**

```
┌──────────────────────────────────────────────────────┐
│  반복 횟수: 2   │  도구 호출 수: 2   │  도메인: MEDICAL  │  ← 요약 메트릭
├──────────────────────────────────────────────────────┤
│  최종 답변                                            │
│  "고혈압의 1차 치료는 생활습관 교정부터 ..."           │
├──────────────────────────────────────────────────────┤
│  🔧 도구 호출 이력                                    │
│  ▶ Step 1 — `search_documents`   [펼치기]            │
│    입력 인자          │  결과 미리보기                 │
│    { "query": "..." } │  {"documents": [...]}        │
│  ▶ Step 2 — `get_long_term_memory` [펼치기]           │
├──────────────────────────────────────────────────────┤
│  ⚡ 실행 흐름                                         │
│  🧑 사용자 질문 → 🔧 search_documents                │
│               → 🔧 get_long_term_memory → 💬 최종 답변│
└──────────────────────────────────────────────────────┘
```

**각 도구 호출 카드 (Step N)**

- **입력 인자**: LLM이 도구에 전달한 파라미터 (`st.json`으로 렌더링)
- **결과 미리보기**: 도구 실행 결과의 앞 400자 (`st.code`로 JSON 하이라이팅)
- 첫 번째 Step은 기본 펼침, 이후는 접힌 상태로 표시

**실행 흐름 다이어그램**

`🧑 사용자 질문 → 🔧 tool1 → 🔧 tool2 → 💬 최종 답변` 형태로 호출 순서를 한눈에 파악할 수 있습니다.

### 탭 3 — 📄 일반 RAG 채팅

**역할**: `POST /chat`을 호출하는 고정 파이프라인 채팅 탭. 오케스트레이터 없이 하이브리드 검색 → LLM의 순서로 실행됩니다.

**오케스트레이터 탭과의 차이**

| 항목 | 오케스트레이터 탭 | 일반 RAG 탭 |
|------|-----------------|-------------|
| 엔드포인트 | `POST /chat/orchestrate` | `POST /chat` |
| 도구 선택 | LLM이 자율 결정 | 고정 순서 |
| Top-K 조정 | 없음 (LLM이 결정) | 슬라이더로 1~10 조정 가능 |
| 참고 문서 표시 | 없음 | 있음 (제목·점수·내용 미리보기) |
| 라우팅 메타 표시 | 없음 | 있음 (라우팅 전략·청크 수·세션 턴) |

**표시 요소**

| 요소 | 설명 |
|------|------|
| Top-K 슬라이더 | 검색할 문서 청크 수 (1~10, 기본값 4) |
| 참고 문서 펼침 | 답변 하단에 `참고 문서 N건` 접이식 패널 — 각 문서 제목·유사도 점수·내용 200자 표시 |
| 라우팅 메타 캡션 | `라우팅: vector · 벡터 청크: 3 · 세션 턴: 2` 형태로 내부 파이프라인 정보 표시 |

### 내부 상태 관리 (`st.session_state`)

| 키 | 타입 | 설명 |
|----|------|------|
| `session_id` | `str` | UUID — 백엔드 단기·장기 기억과 연결되는 세션 식별자 |
| `orch_messages` | `list[dict]` | 오케스트레이터 탭 채팅 이력 (`role`, `content`, `iterations`, `tool_count`) |
| `rag_messages` | `list[dict]` | 일반 RAG 탭 채팅 이력 (`role`, `content`, `refs`) |
| `last_report` | `dict \| None` | 오케스트레이터 마지막 응답 전체 — 리포트 탭에서 읽음 |

새 세션 시작 버튼을 누르면 위 네 가지 상태가 모두 초기화됩니다.

### 호출하는 API 엔드포인트 요약

| 기능 | 메서드 | 경로 |
|------|--------|------|
| 연결 상태 확인 | `GET` | `/health` |
| 파일 업로드 | `POST` | `/ingest/file` |
| 텍스트 등록 | `POST` | `/ingest/text` |
| 오케스트레이터 채팅 | `POST` | `/chat/orchestrate` |
| 일반 RAG 채팅 | `POST` | `/chat` |

---

## 도메인 특화 LLM 개념 정리

### 도메인 특화 LLM이란

범용 LLM을 특정 산업·업무·주제에 맞게 더 정확하고 실무적으로 활용하도록 최적화하는 것입니다.
쉽게 말하면 **똑똑한 일반인을 특정 분야의 실무형 전문가처럼 활용**하는 접근입니다.

**범용 LLM의 한계**

- 전문 용어 해석이 부정확할 수 있음
- 업계 문맥 이해가 부족할 수 있음
- 내부 규정·절차·문서 형식을 반영하지 못할 수 있음
- 답변은 그럴듯하지만 실무 정확도가 부족할 수 있음

**도메인 특화의 효과**

- 전문 용어 이해 향상
- 문맥 정확도 향상
- 실무형 답변 강화
- 업무 자동화 적합성 향상

### 도메인 특화의 대표 방법

| 방법 | 설명 | 특징 |
|------|------|------|
| **프롬프트 특화** | 역할·답변 형식·금지 규칙·용어집을 프롬프트에 반영 | 가장 빠르고 비용이 적음 |
| **RAG** | 관련 문서를 검색한 뒤 그 내용을 근거로 답변 | 최신 정보 반영이 쉬움, 모델 재학습 불필요 |
| **파인튜닝** | 특정 데이터로 모델을 추가 학습 | 응답 스타일 통일, 고정 양식 출력에 강함 |

> **도메인 특화는 목표, RAG·파인튜닝은 그 목표를 달성하는 수단입니다.**

**실무 권장 순서**: 프롬프트 설계 → RAG 구축 → 필요한 부분만 파인튜닝 추가

### 도메인별 설계 포인트

| 도메인 | 핵심 | 주요 고려사항 |
|--------|------|--------------|
| 🏥 의료 | 정확성·근거·책임 경계 | RAG 중심, 진료 가이드라인·약물 정보 연동, "전문의 확인 필요" 안전장치 |
| ⚖️ 법률 | 조문·판례·최신 개정 여부 | 법령·계약서 템플릿 연동, 조항 근거 제시, 최신 개정 반영 |
| 🏭 제조 | 설비·공정·품질·유지보수 | 설비 매뉴얼·SOP·점검 이력 활용, 문서+구조화 데이터 연계 |
| 💰 금융 | 규제·컴플라이언스·설명 책임 | 상품 설명서·약관 연동, 금지 표현 통제(예: 수익 보장) |
| 📚 교육 | 학습 수준별 설명·개인화 | 교안·문제은행 연동, 난이도별 설명, 첨삭 피드백 |

### 도메인 특화 LLM 구축 체크리스트

**1. 목표 정의**
- 어떤 도메인인가 / 어떤 업무를 자동화할 것인가
- 누가 사용할 것인가 / 성공 기준은 무엇인가

**2. 데이터 준비** — 매뉴얼, FAQ, 정책 문서, 보고서, 상담 로그, 용어집
- 중복 제거 / 오래된 문서 제거 / 민감 정보 마스킹 / 메타데이터 저장

**3. 데이터 구조화** — 파싱 → 섹션 분리 → 청킹 → 메타데이터 부여

**4. RAG 구축** — 임베딩 생성 → 벡터 DB 저장 → 유사 문서 검색 → LLM 프롬프트 삽입

**5. 프롬프트 설계** — 역할 정의, 답변 범위, 금지 규칙, 출력 형식 통일

**6. 평가 체계** — 정확성·관련성·완전성·출처 일치성·응답 시간 (측정 가능해야 운영 가능)

**7. 안전장치** — 금칙어 필터, 민감 정보 마스킹, 권한 없는 문서 차단, 위험 응답 제한

**8. 운영 및 지속 개선** — 질문/응답 로그 저장 → 실패 케이스 분석 → 문서 업데이트 반영

### 아키텍처 흐름

```
사용자 질문 → 권한 확인 → 관련 문서 검색 → 검색 결과 재정렬
→ 프롬프트 조립 → LLM 응답 생성 → 출력 정책·안전장치 적용
→ 로그 저장 및 품질 개선
```

> **핵심**: LLM 단독이 아니라 검색·정책·운영 체계를 함께 붙인 **시스템**입니다.

### 배포 환경 비교 (AWS vs On-prem)

| 항목 | AWS형 | On-prem형 |
|------|-------|-----------|
| 문서 저장 | S3 | NAS / 파일 서버 |
| 벡터 DB | OpenSearch / Aurora pgvector | Qdrant / Milvus / pgvector |
| LLM 서빙 | Bedrock / 외부 API | vLLM / Ollama |
| 모니터링 | CloudWatch / X-Ray | Prometheus + Grafana + ELK |
| 장점 | 빠른 구축, 높은 확장성 | 민감정보 통제, 보안 정책 적합 |
| 주의 | 비용 관리, 데이터 반출 정책 | GPU 서버 운영 부담 |

**실무 추천**: 빠른 PoC → AWS / 민감정보 중심 → On-prem / 기업 환경 → 하이브리드

---

## 도메인 지원

| 도메인 | 값 | 시스템 프롬프트 특징 |
|--------|-----|-------------------|
| 의학 | `medical` | 근거 기반 답변, 전문의 상담 권고 안전장치 |
| 고교 영어 | `english` | 학습 친화적 설명, 예문 제공, 한/영 혼용 지원 |
| 일반 | `general` | 범용 RAG 답변 |

---

## 샘플 데이터

`data/samples/` 폴더에 도메인별 샘플 문서가 포함되어 있습니다:

| 파일 | 도메인 | 내용 |
|------|--------|------|
| `medical_hypertension.txt` | 의학 | 고혈압 진료 가이드라인 |
| `medical_diabetes.txt` | 의학 | 당뇨병 진단 및 관리 |
| `english_grammar.txt` | 고교 영어 | 핵심 문법 (시제, 관계대명사, 가정법) |
| `english_reading_writing.txt` | 고교 영어 | 독해·작문·어휘 전략 |

---

## 프로젝트 구조

```
.
├── streamlit_app.py              # Streamlit 데모 UI
├── app/
│   ├── api/routes/
│   │   ├── chat.py               # /chat, /chat/orchestrate 엔드포인트
│   │   ├── ingest.py
│   │   └── health.py
│   ├── core/                     # 설정(config), 데이터베이스(database)
│   ├── models/                   # SQLAlchemy 모델
│   ├── schemas/
│   │   └── chat.py               # ChatRequest/Response + OrchestrateRequest/Response
│   ├── services/
│   │   ├── orchestrator.py       # ★ 메인 오케스트레이터 (Tool Calling 루프)
│   │   ├── tool_registry.py      # ★ 도구 스키마 정의
│   │   ├── tool_executor.py      # ★ 도구 실행기
│   │   ├── rag_service.py        # 고정 파이프라인 RAG
│   │   ├── llm_service.py        # LLM 호출 (generate_answer + call_with_tools)
│   │   ├── hybrid_search.py      # 하이브리드 검색 (Qdrant + PostgreSQL)
│   │   ├── context_router.py     # 컨텍스트 라우터
│   │   ├── session_memory.py     # 단기 기억
│   │   ├── long_term_memory_service.py  # 장기 기억 (pgvector)
│   │   ├── embedder.py
│   │   ├── vector_store.py
│   │   ├── chunker.py
│   │   └── file_parser.py
│   ├── utils/
│   └── main.py
├── data/
│   ├── samples/
│   └── uploads/
├── .github/workflows/            # CI/CD (GitHub Actions)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env
```

---

## CI/CD (GitHub Actions)

### CI 파이프라인 (`.github/workflows/ci.yml`)

`main` / `develop` 브랜치 push 및 PR 시 자동 실행:

1. Python 3.11 환경 설정
2. 의존성 설치
3. flake8 린트 검사
4. pytest 단위 테스트 실행

### CD 파이프라인 (`.github/workflows/cd.yml`)

`main` 브랜치 push 또는 버전 태그(`v*.*.*`) 시 자동 실행:

1. AWS ECR 로그인
2. Docker 이미지 빌드 및 ECR 푸시
3. ECS 태스크 정의 업데이트
4. ECS 서비스 배포 (롤링 업데이트)

#### 필요한 GitHub Secrets / Variables

| 이름 | 종류 | 설명 |
|------|------|------|
| `AWS_ACCESS_KEY_ID` | Secret | AWS IAM 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | Secret | AWS IAM 시크릿 키 |
| `AWS_REGION` | Variable | AWS 리전 (기본값: `ap-northeast-2`) |
| `ECR_REPOSITORY` | Variable | ECR 리포지토리 이름 |
| `ECS_CLUSTER` | Variable | ECS 클러스터 이름 |
| `ECS_SERVICE` | Variable | ECS 서비스 이름 |
| `CONTAINER_NAME` | Variable | 컨테이너 이름 |

---

## 기술 스택

| 구성 요소 | 기술 |
|-----------|------|
| API 서버 | FastAPI + Uvicorn |
| 데모 UI | Streamlit |
| 벡터 DB | Qdrant |
| 관계형 DB | PostgreSQL 16 + pgvector |
| 캐시 | Redis 7 |
| 임베딩 | sentence-transformers (all-MiniLM-L6-v2) |
| PDF 파싱 | pypdf |
| LLM 연동 | httpx + OpenAI 호환 API (vLLM 등) |
| 컨테이너화 | Docker + Docker Compose |
| CI/CD | GitHub Actions + AWS ECR + ECS |

---

## 확장 포인트

### 품질 · 기능 개선 (우선순위 높음)

- 🔁 Reranker 모델 추가 (BGE-reranker 등) — 검색 결과 재정렬
- 🧩 토큰 기반 정교한 청킹 — 현재 문자 수 기준 → 토큰 수 기준으로 전환
- 🏷️ 문서 메타데이터 저장 — 버전·작성자·업로드일 추적
- 🔍 권한 기반 검색 필터 — 사용자 역할별 접근 가능 문서 제한
- 🛠️ 오케스트레이터 도구 추가 — 웹 검색, 계산기, 외부 API 등
- 🔀 병렬 도구 호출 (Parallel Tool Calling) 지원

### 운영 · 보안 강화

- 🔐 JWT 인증 및 권한 기반 문서 접근 제어
- 📈 Prometheus + Grafana 모니터링 연동
- 🌊 SSE(Server-Sent Events) 기반 스트리밍 답변
- 🗃️ 문서 버전 관리 및 삭제 API
- 📋 평가셋 기반 품질 점검 — 정확성·관련성·완전성 지표 자동 측정
- 🔒 금칙어 필터 및 출력 안전장치 강화

### 한 줄 로드맵

> **문서 중심 RAG MVP를 먼저 구축하고, 운영 로그를 기반으로 권한·품질·UI·재정렬·파인튜닝을 점진 확장한다.**
