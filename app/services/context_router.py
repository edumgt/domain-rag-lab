from dataclasses import dataclass


# 최근 대화를 참조하는 한국어·영어 신호어
_RECENCY_MARKERS_KO = [
    "방금", "아까", "이전에", "앞서", "위에서", "말했던", "했던", "그것", "그거",
    "그 내용", "이전 답변", "좀 전", "바로 전", "그때", "다시 설명",
]
_RECENCY_MARKERS_EN = [
    "just now", "you said", "earlier", "previously", "before", "last time",
    "as mentioned", "that answer", "repeat that", "what you told",
]

# 고유명사·전문용어 없이 매우 짧은 질문 → 세션 컨텍스트 의존 가능성 높음
_SHORT_QUESTION_THRESHOLD = 12


@dataclass
class RoutingDecision:
    """컨텍스트 구성 전략을 담는 값 객체."""
    priority: str           # "session" | "vector" | "balanced"
    use_session: bool       # 단기 기억(세션 이력) 포함 여부
    use_vector: bool        # 벡터/하이브리드 문서 검색 포함 여부
    use_long_term: bool     # 장기 기억(pgvector) 포함 여부
    reason: str             # 디버그·로깅용 판단 근거


class ContextRouter:
    """
    질문 맥락 기반 SQL vs Vector 우선순위 판단
    ──────────────────────────────────────────
    규칙:
    1. 최근 대화 참조 신호어 감지 → session 우선 (SQL 최근 대화 이력)
    2. 짧고 모호한 질문 + session_id 있음 → balanced (둘 다 사용)
    3. 그 외 일반 질문 → vector 우선 (하이브리드 문서 검색)

    장기 기억은 session_id가 있을 때 항상 보조로 포함.

    구조 이해 포인트:
    - SQL(최근 대화): 수 턴 이내의 맥락 연속성 유지
    - Vector(과거 지식): 도메인 문서에서 사실적 근거 제공
    - 두 소스를 LLM 프롬프트에 명시적으로 구분하여 전달
    """

    def route(self, question: str, session_id: str | None) -> RoutingDecision:
        q_lower = question.lower()
        has_session = bool(session_id)

        # 규칙 1: 최근 대화 참조 신호어
        if self._has_recency_signal(q_lower):
            return RoutingDecision(
                priority="session",
                use_session=has_session,
                use_vector=True,          # 보조로 벡터도 포함
                use_long_term=has_session,
                reason="recency_marker_detected",
            )

        # 규칙 2: 매우 짧은 질문 (대명사/생략 추측)
        if len(question.strip()) <= _SHORT_QUESTION_THRESHOLD and has_session:
            return RoutingDecision(
                priority="balanced",
                use_session=True,
                use_vector=True,
                use_long_term=True,
                reason="short_question_with_session",
            )

        # 규칙 3: 일반 질문 → 벡터 우선
        return RoutingDecision(
            priority="vector",
            use_session=has_session,
            use_vector=True,
            use_long_term=has_session,
            reason="default_vector_priority",
        )

    def _has_recency_signal(self, q_lower: str) -> bool:
        markers = _RECENCY_MARKERS_KO + _RECENCY_MARKERS_EN
        return any(m in q_lower for m in markers)
