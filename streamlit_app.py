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

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8895")

# ── 페이지 설정 ────────────────────────────────────────────────────
st.set_page_config(
    page_title="Domain RAG Agent",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── 사이드바 ───────────────────────────────────────────────────────
with st.sidebar:
    st.title("⚙️ 설정")
    domain = st.selectbox(
        "도메인",
        ["general", "medical", "english"],
        format_func=lambda x: {"general": "🌐 일반", "medical": "🏥 의학", "english": "📖 고교 영어"}[x],
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
    st.markdown("**API 연결**")
    try:
        health = requests.get(f"{API_BASE}/health", timeout=3).json()
        st.success(f"✅ 연결됨 — {health.get('status', 'ok')}")
    except Exception:
        st.error("❌ API 서버 연결 실패")

    st.divider()

    # 문서 등록 섹션
    st.markdown("**📁 문서 등록**")
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
    ["🤖 오케스트레이터 채팅", "📊 결과 리포트", "📄 일반 RAG 채팅"]
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
