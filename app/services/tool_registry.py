"""
Tool definitions for the Main Orchestrator (OpenAI function-calling schema).
"""

TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "도메인 문서에서 질문과 관련된 청크를 하이브리드 검색(벡터+키워드)으로 가져옵니다. "
                "사실 기반 답변, 특정 지식·용어 조회가 필요할 때 호출하세요."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "검색할 쿼리 문자열"
                    },
                    "domain": {
                        "type": "string",
                        "enum": ["medical", "english", "general"],
                        "description": "검색 대상 도메인"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "가져올 문서 청크 수 (기본값: 4)",
                        "default": 4
                    }
                },
                "required": ["query", "domain"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_session_history",
            "description": (
                "현재 세션의 최근 대화 이력을 가져옵니다. "
                "이전 대화 맥락이 필요하거나 연속된 질문(대명사, 생략 표현)일 때 호출하세요."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "조회할 세션 ID"
                    }
                },
                "required": ["session_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_long_term_memory",
            "description": (
                "과거 세션에서 현재 질문과 의미적으로 유사한 기억을 pgvector로 검색합니다. "
                "사용자 이력·맥락 기반 개인화 답변이 필요할 때 호출하세요."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "검색할 쿼리"
                    },
                    "domain": {
                        "type": "string",
                        "enum": ["medical", "english", "general"],
                        "description": "검색 대상 도메인"
                    }
                },
                "required": ["query", "domain"]
            }
        }
    },
]

TOOL_NAMES: set[str] = {t["function"]["name"] for t in TOOL_DEFINITIONS}
