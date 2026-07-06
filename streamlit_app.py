"""
Streamlit Demo UI — Domain RAG with Main Orchestrator
══════════════════════════════════════════════════════
탭 구성:
  🤖 오케스트레이터 채팅 — 도구 호출 기반 멀티턴 챗봇
  📊 결과 리포트       — 도구 호출 이력 · 메타 정보 시각화
  📄 일반 RAG 채팅     — 기존 파이프라인 채팅
"""

import os
import uuid
import requests
import streamlit as st

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8190")

# ── 페이지 설정 ────────────────────────────────────────────────────
st.set_page_config(
    page_title="Domain RAG Agent",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── 글로벌 스타일 (검정·노랑 테마, Pretendard, FontAwesome) ─────────
st.markdown("""
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" rel="stylesheet"/>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet"/>
<style>
:root {
  --bg:         #0a0a0a;
  --surface:    #111111;
  --surface2:   #1a1a1a;
  --border:     #2a2a2a;
  --accent:     #F5C518;
  --accent-hov: #FFD740;
  --accent-dim: rgba(245,197,24,0.12);
  --text:       #F0F0F0;
  --text-muted: #777777;
  --danger:     #FF4444;
  --success:    #22C55E;
  --font:       'Pretendard Variable','Pretendard',-apple-system,sans-serif;
}

/* 전체 폰트·배경 */
html, body, [data-testid="stApp"], .stApp {
  font-family: var(--font) !important;
  font-size: 18px !important;
  background: var(--bg) !important;
  color: var(--text) !important;
  -webkit-font-smoothing: antialiased;
}

/* 사이드바 */
[data-testid="stSidebar"] {
  background: var(--surface) !important;
  border-right: 2px solid var(--border) !important;
}
[data-testid="stSidebar"] * { font-family: var(--font) !important; }
[data-testid="stSidebarContent"] { padding: 1rem 1rem !important; }

/* 메인 영역 */
.main .block-container {
  background: var(--bg) !important;
  padding-top: 1.5rem !important;
  max-width: 100% !important;
}

/* 헤더 텍스트 */
h1 { font-size: 26px !important; font-weight: 800 !important; color: var(--text) !important; letter-spacing: -0.02em !important; }
h2 { font-size: 22px !important; font-weight: 700 !important; color: var(--text) !important; }
h3 { font-size: 19px !important; font-weight: 700 !important; color: var(--text) !important; }
p, li, span, div, label { font-family: var(--font) !important; color: var(--text) !important; }

/* 캡션·작은 글씨 */
[data-testid="stCaptionContainer"] p,
.stCaption, small {
  font-size: 13px !important;
  color: var(--text-muted) !important;
}

/* 탭 */
[data-baseweb="tab-list"] {
  background: var(--surface) !important;
  border-bottom: 2px solid var(--border) !important;
  gap: 2px !important;
}
[data-baseweb="tab"] {
  background: transparent !important;
  color: var(--text-muted) !important;
  font-size: 17px !important;
  font-weight: 600 !important;
  font-family: var(--font) !important;
  padding: 10px 22px !important;
  border: none !important;
  border-radius: 4px 4px 0 0 !important;
}
[aria-selected="true"][data-baseweb="tab"] {
  background: var(--surface2) !important;
  color: var(--accent) !important;
  border-bottom: 3px solid var(--accent) !important;
}
[data-baseweb="tab-panel"] {
  background: var(--bg) !important;
  padding-top: 1.5rem !important;
}

/* 버튼 */
.stButton > button {
  background: var(--accent) !important;
  color: #000 !important;
  border: none !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  font-family: var(--font) !important;
  border-radius: 5px !important;
  padding: 10px 22px !important;
  transition: background 0.15s !important;
}
.stButton > button:hover { background: var(--accent-hov) !important; }

/* 셀렉박스 */
[data-baseweb="select"] > div {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  color: var(--text) !important;
  font-size: 17px !important;
  font-family: var(--font) !important;
  border-radius: 5px !important;
}
[data-baseweb="select"] > div:focus-within { border-color: var(--accent) !important; }
[data-baseweb="popover"] ul { background: var(--surface2) !important; }
[role="option"] { background: var(--surface2) !important; color: var(--text) !important; font-family: var(--font) !important; }
[role="option"]:hover { background: var(--accent-dim) !important; color: var(--accent) !important; }
[aria-selected="true"][role="option"] { background: var(--accent-dim) !important; color: var(--accent) !important; }

/* 텍스트 인풋 */
[data-testid="stTextInput"] input,
[data-testid="stTextArea"] textarea {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  color: var(--text) !important;
  font-size: 17px !important;
  font-family: var(--font) !important;
  border-radius: 5px !important;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stTextArea"] textarea:focus {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px rgba(245,197,24,0.18) !important;
}

/* 채팅 메시지 */
[data-testid="stChatMessage"] {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  border-radius: 8px !important;
  font-size: 18px !important;
  font-family: var(--font) !important;
  padding: 14px 18px !important;
}
[data-testid="stChatMessage"] p { font-size: 18px !important; line-height: 1.75 !important; }

/* 채팅 입력창 */
[data-testid="stChatInput"] {
  background: var(--surface) !important;
  border-top: 2px solid var(--border) !important;
}
[data-testid="stChatInput"] textarea {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  color: var(--text) !important;
  font-size: 18px !important;
  font-family: var(--font) !important;
  border-radius: 6px !important;
}
[data-testid="stChatInput"] textarea:focus { border-color: var(--accent) !important; }
[data-testid="stChatInputSubmitButton"] button {
  background: var(--accent) !important;
  color: #000 !important;
  border-radius: 5px !important;
}

/* 메트릭 */
[data-testid="stMetric"] {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  border-radius: 8px !important;
  padding: 18px 22px !important;
}
[data-testid="stMetricValue"] {
  color: var(--accent) !important;
  font-size: 30px !important;
  font-weight: 800 !important;
}
[data-testid="stMetricLabel"] {
  color: var(--text-muted) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
}

/* 익스팬더 */
[data-testid="stExpander"] {
  background: var(--surface2) !important;
  border: 1.5px solid var(--border) !important;
  border-radius: 8px !important;
}
[data-testid="stExpander"] summary {
  color: var(--text) !important;
  font-size: 17px !important;
  font-weight: 600 !important;
  font-family: var(--font) !important;
}
[data-testid="stExpander"] summary:hover { color: var(--accent) !important; }

/* 구분선 */
hr { border-color: var(--border) !important; border-width: 1.5px !important; }

/* 알림 */
[data-testid="stAlert"] { border-radius: 6px !important; font-size: 16px !important; font-family: var(--font) !important; }

/* 슬라이더 */
[data-baseweb="slider"] [role="slider"] {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
}
[data-baseweb="slider"] [data-testid="stThumbValue"] { color: var(--accent) !important; }

/* 파일 업로더 */
[data-testid="stFileUploader"] {
  background: var(--surface2) !important;
  border: 2px dashed var(--border) !important;
  border-radius: 8px !important;
}

/* JSON 뷰 */
[data-testid="stJson"] { background: var(--surface2) !important; border-radius: 6px !important; }

/* 코드 블록 */
[data-testid="stCode"], .stCodeBlock {
  background: var(--surface2) !important;
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
}

/* 스크롤바 */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }
</style>
""", unsafe_allow_html=True)

# ── 사이드바 ───────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<h2 style="color:#F5C518;font-size:22px;font-weight:800;margin-bottom:4px"><i class="fa-solid fa-brain"></i> Domain RAG</h2><p style="color:#777;font-size:13px;margin-top:0">도메인 특화 AI 에이전트</p>', unsafe_allow_html=True)
    st.divider()
    st.markdown('<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#777">도메인 선택</p>', unsafe_allow_html=True)
    domain = st.selectbox(
        "",
        ["general", "medical", "english", "finance"],
        format_func=lambda x: {"general": "🌐 일반", "medical": "🏥 의학", "english": "📖 고교 영어", "finance": "📈 금융·투자"}[x],
        label_visibility="collapsed",
    )

    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())

    st.text_input("세션 ID", value=st.session_state.session_id, disabled=True)

    if st.button("🔄 새 세션 시작"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.orch_messages = []
        st.session_state.rag_messages = []
        st.session_state.last_report = None
        st.rerun()

    st.divider()
    st.markdown('<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#777"><i class="fa-solid fa-signal"></i> API 연결</p>', unsafe_allow_html=True)
    try:
        health = requests.get(f"{API_BASE}/health", timeout=3).json()
        st.success(f"✅ 연결됨 — {health.get('status', 'ok')}")
    except Exception:
        st.error("❌ API 서버 연결 실패")

    st.divider()
    st.markdown('<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#777"><i class="fa-solid fa-folder-open"></i> 문서 등록</p>', unsafe_allow_html=True)
    uploaded = st.file_uploader("파일 업로드 (TXT/PDF)", type=["txt", "pdf"])
    if uploaded and st.button("업로드"):
        with st.spinner("등록 중..."):
            try:
                resp = requests.post(
                    f"{API_BASE}/ingest/file",
                    files={"file": (uploaded.name, uploaded.getvalue())},
                    data={"domain": domain},
                    timeout=60,
                )
                resp.raise_for_status()
                info = resp.json()
                st.success(f"✅ {info['chunks']}개 청크 등록 완료")
            except Exception as e:
                st.error(f"등록 실패: {e}")

    text_title = st.text_input("제목", placeholder="문서 제목")
    text_content = st.text_area("텍스트 직접 등록", height=100, placeholder="내용을 입력하세요...")
    if st.button("텍스트 등록"):
        if text_title and text_content:
            with st.spinner("등록 중..."):
                try:
                    resp = requests.post(
                        f"{API_BASE}/ingest/text",
                        json={
                            "document_id": str(uuid.uuid4()),
                            "title": text_title,
                            "content": text_content,
                            "domain": domain,
                        },
                        timeout=30,
                    )
                    resp.raise_for_status()
                    info = resp.json()
                    st.success(f"✅ {info['chunks']}개 청크 등록")
                except Exception as e:
                    st.error(f"등록 실패: {e}")
        else:
            st.warning("제목과 내용을 모두 입력하세요.")

# ── 상태 초기화 ───────────────────────────────────────────────────
for key, default in [
    ("orch_messages", []),
    ("rag_messages", []),
    ("last_report", None),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# ── 탭 ────────────────────────────────────────────────────────────
tab_orch, tab_report, tab_rag = st.tabs(
    ["🤖  오케스트레이터 채팅", "📊  결과 리포트", "📄  일반 RAG 채팅"]
)

# ══════════════════════════════════════════════════════════════════
# Tab 1 — Orchestrator Chat
# ══════════════════════════════════════════════════════════════════
with tab_orch:
    st.header("🤖 메인 오케스트레이터 채팅")
    st.caption(
        "LLM이 **필요한 도구를 스스로 선택·호출**하여 답변을 생성합니다. "
        "도구 호출 결과는 📊 리포트 탭에서 확인하세요."
    )

    # Chat history
    for msg in st.session_state.orch_messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and msg.get("iterations"):
                st.caption(f"반복 {msg['iterations']}회 · 도구 {msg['tool_count']}개 호출")

    # Input
    if prompt := st.chat_input("질문을 입력하세요...", key="orch_input"):
        st.session_state.orch_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("오케스트레이터 실행 중..."):
                try:
                    resp = requests.post(
                        f"{API_BASE}/chat/orchestrate",
                        json={
                            "question": prompt,
                            "domain": domain,
                            "session_id": st.session_state.session_id,
                        },
                        timeout=120,
                    )
                    resp.raise_for_status()
                    data = resp.json()

                    answer = data["answer"]
                    tool_calls = data.get("tool_calls", [])
                    iterations = data.get("iterations", 1)

                    st.markdown(answer)
                    st.caption(f"반복 {iterations}회 · 도구 {len(tool_calls)}개 호출")

                    # Store for report tab
                    st.session_state.last_report = data
                    st.session_state.orch_messages.append(
                        {
                            "role": "assistant",
                            "content": answer,
                            "iterations": iterations,
                            "tool_count": len(tool_calls),
                        }
                    )
                except Exception as e:
                    err = f"오류: {e}"
                    st.error(err)
                    st.session_state.orch_messages.append(
                        {"role": "assistant", "content": err}
                    )

# ══════════════════════════════════════════════════════════════════
# Tab 2 — Report
# ══════════════════════════════════════════════════════════════════
with tab_report:
    st.header("📊 오케스트레이터 실행 리포트")

    report = st.session_state.last_report
    if report is None:
        st.info("아직 오케스트레이터 채팅을 실행하지 않았습니다. 채팅 탭에서 먼저 질문하세요.")
    else:
        col1, col2, col3 = st.columns(3)
        col1.metric("반복 횟수", report.get("iterations", "-"))
        col2.metric("도구 호출 수", len(report.get("tool_calls", [])))
        col3.metric("도메인", report.get("domain", "-").upper())

        st.divider()
        st.subheader("최종 답변")
        st.markdown(report.get("answer", ""))

        tool_calls = report.get("tool_calls", [])
        if tool_calls:
            st.divider()
            st.subheader("🔧 도구 호출 이력")
            for i, tc in enumerate(tool_calls, 1):
                with st.expander(f"Step {i} — `{tc['tool']}`", expanded=(i == 1)):
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.markdown("**입력 인자**")
                        st.json(tc.get("arguments", {}))
                    with col_b:
                        st.markdown("**결과 미리보기**")
                        st.code(tc.get("result_preview", ""), language="json")
        else:
            st.info("이번 답변에서는 도구가 호출되지 않았습니다.")

        # Tool call flow visualization
        if tool_calls:
            st.divider()
            st.subheader("⚡ 실행 흐름")
            flow_steps = ["🧑 사용자 질문"] + [f"🔧 `{tc['tool']}`" for tc in tool_calls] + ["💬 최종 답변"]
            st.markdown(" → ".join(flow_steps))

# ══════════════════════════════════════════════════════════════════
# Tab 3 — Standard RAG Chat
# ══════════════════════════════════════════════════════════════════
with tab_rag:
    st.header("📄 일반 RAG 채팅")
    st.caption("고정 파이프라인(하이브리드 검색 → LLM)을 사용하는 기존 방식입니다.")

    for msg in st.session_state.rag_messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and msg.get("refs"):
                with st.expander(f"참고 문서 {len(msg['refs'])}건"):
                    for ref in msg["refs"]:
                        st.markdown(f"**{ref['title']}** (score: {ref['score']:.3f})")
                        st.caption(ref["content"][:200])

    top_k = st.slider("Top-K", 1, 10, 4, key="rag_topk")

    if prompt := st.chat_input("질문을 입력하세요...", key="rag_input"):
        st.session_state.rag_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("검색 중..."):
                try:
                    resp = requests.post(
                        f"{API_BASE}/chat",
                        json={
                            "question": prompt,
                            "domain": domain,
                            "session_id": st.session_state.session_id,
                            "top_k": top_k,
                        },
                        timeout=120,
                    )
                    resp.raise_for_status()
                    data = resp.json()

                    answer = data["answer"]
                    refs = data.get("references", [])
                    meta = data.get("context_meta", {})

                    st.markdown(answer)

                    if refs:
                        with st.expander(f"참고 문서 {len(refs)}건"):
                            for ref in refs:
                                st.markdown(f"**{ref['title']}** (score: {ref['score']:.3f})")
                                st.caption(ref["content"][:200])

                    if meta:
                        st.caption(
                            f"라우팅: {meta.get('routing')} · "
                            f"벡터 청크: {meta.get('vector_chunks')} · "
                            f"세션 턴: {meta.get('session_turns')}"
                        )

                    st.session_state.rag_messages.append(
                        {"role": "assistant", "content": answer, "refs": refs}
                    )
                except Exception as e:
                    err = f"오류: {e}"
                    st.error(err)
                    st.session_state.rag_messages.append(
                        {"role": "assistant", "content": err, "refs": []}
                    )
