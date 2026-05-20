from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chat_log import ChatLog


class SessionMemoryService:
    """
    단기 기억 (Short-term Memory)
    ─────────────────────────────
    PostgreSQL chat_logs 테이블에서 동일 session_id의 최근 N턴을
    조회하여 LLM 프롬프트의 대화 이력 컨텍스트로 제공.

    구조 이해 포인트:
    - session_id 단위로 대화가 그룹화됨
    - 최신 → 오래된 순으로 조회 후 역순 정렬 → 시간 순 프롬프트 삽입
    - 세션 종료(브라우저 새로고침 등) 시 장기 기억으로 승격 가능
    """

    def get_recent_turns(self, db: Session, session_id: str) -> list[dict]:
        """최근 N턴의 대화를 시간 순(오래된 것→최신)으로 반환."""
        if not session_id:
            return []

        rows = (
            db.query(ChatLog)
            .filter(ChatLog.session_id == session_id)
            .order_by(ChatLog.created_at.desc())
            .limit(settings.session_memory_turns)
            .all()
        )

        # 오래된 순으로 뒤집어서 반환
        return [
            {"question": row.question, "answer": row.answer, "created_at": row.created_at}
            for row in reversed(rows)
        ]
