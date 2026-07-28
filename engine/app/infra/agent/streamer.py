"""Shared agent stream processor - iterate agent.astream() dan emit SSE-shaped events.

Dipakai orchestrator service (dan nanti subagent service kalau perlu). Dipisah dari domain
spesifik karena stream processing logic-nya generic - tinggal pass agent instance + config.

Events emitted:
  - {"event": "todos_updated", "data": <todos list>}
  - {"event": "message_delta", "data": {"content": <ai text>}}
  - {"event": "completed", "data": {"chatSessionId": int, "content": str}}
"""

import json
import logging
from collections.abc import AsyncIterator

from langchain_core.messages import AIMessage

logger = logging.getLogger(__name__)

# LangGraph default (25) terlalu ketat: satu cycle self-correction
# (investigate + draft + tsc_no_emit + run_linter_and_tests + revise, bisa beberapa docker pass)
# burn ~2 graph steps per tool call.
AGENT_RECURSION_LIMIT = 100

# Wall-clock ceiling independent dari step count - docker run tsc/test bisa 1-3+ menit.
AGENT_TURN_TIMEOUT_SECONDS = 600


class AgentStreamer:
    """Iterate agent.astream(stream_mode="values") dan emit SSE-shaped events.

    State (last_todos_json, last_message_count, last_ai_text) encapsulated di sini,
    jadi caller gak perlu tau detail diffing logic. Testable secara terisolasi - tinggal
    pass mock agent.
    """

    def __init__(self, chat_session_id: int):
        self._chat_session_id = chat_session_id
        self._last_todos_json = ""
        self._last_message_count = 0
        self._last_ai_text = ""

    async def seed_from_state(self, agent, config: dict) -> None:
        """Seed message count dari prior state - cegah replay pesan lama sebagai 'baru'."""
        prior_state = await agent.aget_state(config)
        self._last_message_count = len((prior_state.values or {}).get("messages") or [])
        logger.debug("prior message count: %d", self._last_message_count)

    async def stream(self, agent, config: dict, content: str) -> AsyncIterator[dict]:
        """Iterate agent stream, yield events. Dipanggil di dalam asyncio.timeout wrapper."""
        async for chunk in agent.astream(
            {"messages": [{"role": "user", "content": content}]},
            config,
            stream_mode="values",
        ):
            logger.debug("chunk: %s", chunk)
            for event in self._process_chunk(chunk):
                yield event

        # Final completed event with accumulated ai text.
        yield {
            "event": "completed",
            "data": {"chatSessionId": self._chat_session_id, "content": self._last_ai_text},
        }

    def _process_chunk(self, chunk: dict) -> list[dict]:
        """Process satu chunk, return list of events (bisa 0, 1, atau lebih)."""
        events: list[dict] = []

        # Todos: emit kalau berubah.
        todos = chunk.get("todos")
        if todos:
            logger.debug("todos: %s", todos)
            todos_json = json.dumps(todos, default=str)
            if todos_json != self._last_todos_json:
                self._last_todos_json = todos_json
                events.append({"event": "todos_updated", "data": todos})

        # Messages: emit new AIMessage deltas.
        messages = chunk.get("messages") or []
        if len(messages) > self._last_message_count:
            for message in messages[self._last_message_count :]:
                logger.debug(
                    "message type=%s content=%r",
                    type(message).__name__,
                    str(getattr(message, "text", message)),
                )
                if isinstance(message, AIMessage):
                    self._last_ai_text = str(message.text)
                    logger.debug("AI reply: %s", self._last_ai_text)
                    events.append({"event": "message_delta", "data": {"content": self._last_ai_text}})
            self._last_message_count = len(messages)

        return events