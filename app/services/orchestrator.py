"""
Main Orchestrator with Tool Calling
────────────────────────────────────
LLM이 어떤 도구를 어떤 순서로 호출할지 스스로 판단하고,
수집된 정보를 바탕으로 최종 답변을 생성하는 에이전트 루프.

흐름:
  1. 사용자 질문 + 도메인 시스템 프롬프트 + 도구 정의를 LLM에 전달
  2. LLM이 tool_calls 반환 → 도구 실행 → 결과를 messages에 추가 → 반복
  3. LLM이 일반 텍스트 반환 → 최종 답변 확정
  4. MAX_ITERATIONS 초과 시 강제로 최종 답변 요청
"""

import json
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.embedder import EmbeddingService
from app.services.llm_service import DOMAIN_SYSTEM_PROMPTS, LLMService
from app.services.long_term_memory_service import LongTermMemoryService
from app.services.tool_executor import ToolExecutor
from app.services.tool_registry import TOOL_DEFINITIONS

MAX_ITERATIONS = 5

_ORCHESTRATOR_PREFIX = (
    "당신은 메인 오케스트레이터(AI 에이전트)입니다.\n"
    "사용자의 질문에 답하기 위해 필요한 도구를 스스로 판단하여 순서대로 호출하세요.\n"
    "가용 도구: search_documents, get_session_history, get_long_term_memory\n"
    "도구 호출이 모두 끝나면, 수집된 정보만 근거로 명확하고 신뢰할 수 있는 최종 답변을 작성하세요.\n"
)


@dataclass
class ToolCallRecord:
    tool: str
    arguments: dict
    result_preview: str


@dataclass
class OrchestratorResult:
    answer: str
    tool_calls: list[ToolCallRecord] = field(default_factory=list)
    iterations: int = 0
    domain: str = "general"
    session_id: str | None = None


class MainOrchestrator:
    """
    도구 호출 루프를 통해 LLM 스스로 컨텍스트를 수집하고 답변하는 오케스트레이터.
    """

    def __init__(self):
        self.llm = LLMService()
        self.executor = ToolExecutor()
        self.embedder = EmbeddingService(settings.embedding_model)
        self.long_term_memory = LongTermMemoryService()

    def run(
        self,
        db: Session,
        question: str,
        domain: str = "general",
        session_id: str | None = None,
    ) -> OrchestratorResult:
        domain_prompt = DOMAIN_SYSTEM_PROMPTS.get(domain, DOMAIN_SYSTEM_PROMPTS["general"])
        system_content = _ORCHESTRATOR_PREFIX + "\n" + domain_prompt

        messages: list[dict] = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

        tool_call_records: list[ToolCallRecord] = []
        iteration = 0

        while iteration < MAX_ITERATIONS:
            iteration += 1
            raw = self.llm.call_with_tools(messages, TOOL_DEFINITIONS)

            choice = raw.get("choices", [{}])[0]
            message = choice.get("message", {})
            finish_reason = choice.get("finish_reason", "stop")

            # Append assistant turn so the next iteration has full history
            messages.append(message)

            tool_calls = message.get("tool_calls") or []
            if finish_reason == "tool_calls" or tool_calls:
                for tc in tool_calls:
                    fn = tc.get("function", {})
                    tool_name = fn.get("name", "")
                    try:
                        arguments = json.loads(fn.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        arguments = {}

                    tool_result = self.executor.execute(tool_name, arguments, db)
                    tool_call_records.append(
                        ToolCallRecord(
                            tool=tool_name,
                            arguments=arguments,
                            result_preview=tool_result[:400],
                        )
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.get("id", ""),
                            "content": tool_result,
                        }
                    )
            else:
                # LLM returned a text answer — orchestration complete
                answer = (message.get("content") or "").strip()
                if not answer:
                    answer = "응답을 생성하지 못했습니다."

                self._maybe_store_memory(db, question, answer, session_id, domain)

                return OrchestratorResult(
                    answer=answer,
                    tool_calls=tool_call_records,
                    iterations=iteration,
                    domain=domain,
                    session_id=session_id,
                )

        # Safety: max iterations exceeded → force final answer
        messages.append(
            {"role": "user", "content": "지금까지 수집한 정보를 바탕으로 최종 답변을 작성해 주세요."}
        )
        raw = self.llm.call_with_tools(messages, tools=None)
        answer = (
            (raw.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
            or "최대 반복 횟수에 도달하여 답변을 생성하지 못했습니다."
        )

        self._maybe_store_memory(db, question, answer, session_id, domain)

        return OrchestratorResult(
            answer=answer,
            tool_calls=tool_call_records,
            iterations=iteration,
            domain=domain,
            session_id=session_id,
        )

    def _maybe_store_memory(
        self,
        db: Session,
        question: str,
        answer: str,
        session_id: str | None,
        domain: str,
    ) -> None:
        if session_id and len(answer) > 80:
            memory_text = f"Q: {question}\nA: {answer[:400]}"
            mem_vector = self.embedder.embed_query(memory_text)
            self.long_term_memory.store(
                db=db,
                content=memory_text,
                embedding=mem_vector,
                session_id=session_id,
                domain=domain,
            )
