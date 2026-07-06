import httpx

from app.core.config import settings

DOMAIN_SYSTEM_PROMPTS: dict[str, str] = {
    "medical": (
        "당신은 의학 전문 RAG 어시스턴트입니다.\n"
        "반드시 제공된 의학 문헌과 문맥에 근거해서만 답변하세요.\n"
        "진단, 처방, 치료 결정을 단정짓지 말고, 항상 '전문의와 상담하세요' 안전장치를 포함하세요.\n"
        "의학 용어를 정확히 사용하되, 이해하기 어려운 용어는 간략히 설명하세요.\n"
        "근거가 부족하면 '확인 필요 — 전문의 상담을 권장합니다'라고 답하세요.\n"
        "답변은 한국어로 작성하세요."
    ),
    "english": (
        "You are a high school English education RAG assistant.\n"
        "Answer only based on the provided educational materials and context.\n"
        "Use clear, student-friendly language appropriate for high school level.\n"
        "When explaining grammar or vocabulary, provide concise examples.\n"
        "If the context is insufficient, say '자료가 부족합니다. 교재를 추가로 등록해 주세요.'\n"
        "Respond in Korean when the question is in Korean, otherwise respond in English."
    ),
    "finance": (
        "당신은 금융·주식·투자 분석 전문 RAG 어시스턴트입니다.\n"
        "반드시 제공된 투자 분석 문서(재무제표, 밸류에이션, 거시경제, 기술적 분석, 자산배분 등)에 근거해서만 답변하세요.\n"
        "특정 종목의 매수·매도를 단정적으로 추천하지 말고, 개념·지표·분석 방법 설명에 집중하세요.\n"
        "숫자·공식(PER, PBR, ROE, 현금흐름 등)을 인용할 때는 문맥에 있는 정의를 그대로 사용하세요.\n"
        "근거가 부족하면 추측하지 말고 '확인 필요 — 추가 자료나 최신 공시를 확인하세요'라고 답하세요.\n"
        "답변 말미에 '투자 판단과 책임은 투자자 본인에게 있습니다' 안내를 포함하세요.\n"
        "답변은 한국어로 작성하세요."
    ),
    "general": (
        "당신은 도메인 특화 RAG 어시스턴트입니다.\n"
        "반드시 제공된 문맥에 근거해서만 답변하세요.\n"
        "근거가 부족하면 추정하지 말고 '확인 필요'라고 답하세요.\n"
        "답변은 한국어로 작성하세요."
    ),
}


class LLMService:
    def __init__(self):
        self.base_url = settings.vllm_base_url.rstrip("/")
        self.model = settings.vllm_model
        self.api_key = settings.vllm_api_key

    def generate_answer(
        self,
        question: str,
        chunks: list[dict],
        domain: str = "general",
        session_history: list[dict] | None = None,
        long_term_hits: list[dict] | None = None,
        routing_priority: str = "vector",
    ) -> str:
        """
        프롬프트 조립 순서 (우선순위 반영):
        ① 시스템 프롬프트 (도메인 규칙)
        ② 장기 기억 (pgvector 유사 기억, 있으면 포함)
        ③ 단기 세션 이력 (최근 대화, session 우선일 때 먼저)
        ④ 검색된 문서 청크 (vector 우선일 때 먼저)
        ⑤ 현재 질문
        """
        if not chunks and not session_history and not long_term_hits:
            return "관련 문서를 찾지 못했습니다. 문서를 먼저 등록하거나 질문을 더 구체적으로 입력해 주세요."

        system_prompt = DOMAIN_SYSTEM_PROMPTS.get(domain, DOMAIN_SYSTEM_PROMPTS["general"])

        user_parts: list[str] = []

        # ── 장기 기억 블록 ────────────────────────────────────────
        if long_term_hits:
            lt_block = "\n".join(
                f"[장기 기억 {i}] {hit['content']}"
                for i, hit in enumerate(long_term_hits, 1)
            )
            user_parts.append(f"=== 관련 장기 기억 ===\n{lt_block}")

        # ── 세션 이력 블록 vs 문서 청크 블록: 우선순위에 따라 순서 결정 ─
        session_block = self._build_session_block(session_history)
        doc_block = self._build_doc_block(chunks)

        if routing_priority == "session":
            if session_block:
                user_parts.append(session_block)
            if doc_block:
                user_parts.append(doc_block)
        else:
            if doc_block:
                user_parts.append(doc_block)
            if session_block:
                user_parts.append(session_block)

        user_parts.append(f"=== 현재 질문 ===\n{question}")
        user_parts.append("위 문맥만 근거로 답변하고, 마지막에 핵심 참고 출처를 짧게 언급하세요.")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "\n\n".join(user_parts)},
            ],
            "temperature": 0.2,
            "max_tokens": 700,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            titles = ", ".join(sorted(set(c["title"] for c in chunks))) if chunks else "없음"
            return (
                f"LLM 호출에 실패했습니다: {e}\n\n"
                f"대신 검색 결과 기준으로 보면, 관련 문서는 {titles} 입니다."
            )

    def call_with_tools(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
    ) -> dict:
        """
        Call LLM with an explicit message list and optional tool definitions.
        Returns the raw API response dict so the orchestrator can inspect
        finish_reason and tool_calls.
        """
        payload: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1000,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": f"LLM 호출 실패: {e}",
                        },
                        "finish_reason": "stop",
                    }
                ]
            }

    # ── 내부 헬퍼 ────────────────────────────────────────────────

    def _build_session_block(self, session_history: list[dict] | None) -> str:
        if not session_history:
            return ""
        turns = "\n".join(
            f"사용자: {t['question']}\n어시스턴트: {t['answer']}"
            for t in session_history
        )
        return f"=== 최근 대화 이력 (단기 기억) ===\n{turns}"

    def _build_doc_block(self, chunks: list[dict]) -> str:
        if not chunks:
            return ""
        docs = "\n\n".join(
            f"[문서 {i}] 제목: {c['title']}\n내용: {c['content']}"
            for i, c in enumerate(chunks, 1)
        )
        return f"=== 참고 문서 (벡터·키워드 검색) ===\n{docs}"
