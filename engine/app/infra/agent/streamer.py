"""Agent stream processor - iterate agent.astream() dan emit SSE-shaped events.

LangChain/DeepAgents .astream(stream_mode="values") return full state snapshot per step,
bukan delta. Function ini diff tiap snapshot dan emit hanya yang baru:

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


async def stream_agent_events(
    agent,
    config: dict,
    content: str,
    chat_session_id: int,
) -> AsyncIterator[dict]:
    """Stream agent.astream(), yield SSE-shaped events (todos_updated / message_delta / completed).

    Args:
        agent: Deep Agent instance (orchestrator).
        config: LangGraph config dict (thread_id, recursion_limit, etc).
        content: User message text.
        chat_session_id: ID chat session (buat completed event).

    Yields:
        dict with "event" and "data" keys, siap di-NDJSON-kan routes.py.
    """
    # Seed message count dari prior state - cegah replay pesan lama sebagai "baru".
    prior_state = await agent.aget_state(config)
    last_msg_count = len((prior_state.values or {}).get("messages") or [])
    last_todos_json = ""
    last_ai_text = ""
    step_count = 0

    logger.info("streaming started (chat_session_id=%s)", chat_session_id)

    async for chunk in agent.astream(
        {"messages": [{"role": "user", "content": content}]},
        config,
        stream_mode="values",
    ):

        logger.debug("ISI DARI CHUNK: %s", chunk['messages'][0])
        logger.debug("CHUNK TYPE: %s | MESSAGES TYPE: %s | LAST MSG TYPE: %s", type(chunk).__name__, type(chunk.get("messages")).__name__, type(chunk.get("messages", [None])[-1]).__name__ if chunk.get("messages") else "N/A")
        step_count += 1

        # Todos: emit kalau berubah.
        todos = chunk.get("todos")
        if todos:
            todos_json = json.dumps(todos, default=str)
            if todos_json != last_todos_json:
                last_todos_json = todos_json
                logger.debug("todos updated (chat_session_id=%s): %s", chat_session_id, todos_json)
                yield {"event": "todos_updated", "data": todos}

        # Messages: emit new AIMessage deltas.
        messages = chunk.get("messages") or []
        if len(messages) > last_msg_count:
            for message in messages[last_msg_count:]:
                if isinstance(message, AIMessage):
                    last_ai_text = str(message.text)
                    logger.debug("message delta (chat_session_id=%s): %s", chat_session_id, last_ai_text[:200])
                    yield {"event": "message_delta", "data": {"content": last_ai_text}}
            last_msg_count = len(messages)

    logger.info("streaming completed (chat_session_id=%s, steps=%s, content_length=%s)", chat_session_id, step_count, len(last_ai_text))
    yield {
        "event": "completed",
        "data": {"chatSessionId": chat_session_id, "content": last_ai_text},
    }
