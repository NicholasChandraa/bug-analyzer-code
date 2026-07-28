"""invoke_orchestrator() - stream events dari orchestrator agent ke Backend (NDJSON).

Orchestrator menerima request, klasifikasi intent, delegasi ke subagent via `task` tool,
lalu stream events kembali. AgentStreamer (infra/agent/streamer.py) reusable - orchestrator
dan subagent-nya sama-sama emit state dengan shape yang sama (messages/todos).
"""

import asyncio
import logging
from collections.abc import AsyncIterator

from langgraph.errors import GraphRecursionError  # type: ignore[import-not-found]

from app.infra.agent.streamer import (
    AGENT_RECURSION_LIMIT,
    AGENT_TURN_TIMEOUT_SECONDS,
    AgentStreamer,
)
from app.infra.llm.errors import classify_llm_error
from app.infra.security.sensitive import mask_sensitive

logger = logging.getLogger(__name__)


async def invoke_orchestrator(agent, chat_session_id: int, content: str) -> AsyncIterator[dict]:
    """Stream todos_updated / message_delta / completed / error events dari orchestrator.

    Args:
        agent: Orchestrator Deep Agent instance dari create_orchestrator_agent().
        chat_session_id: ID chat session (jadi thread_id LangGraph checkpointer).
        content: Teks pesan user.

    Yields:
        dict dengan keys "event" dan "data", siap di-NDJSON-kan routes.py.
    """
    config = {
        "configurable": {"thread_id": str(chat_session_id)},
        "recursion_limit": AGENT_RECURSION_LIMIT,
    }

    logger.info("user message (chat_session_id=%s): %s", chat_session_id, content)

    streamer = AgentStreamer(chat_session_id)
    try:
        await streamer.seed_from_state(agent, config)

        async with asyncio.timeout(AGENT_TURN_TIMEOUT_SECONDS):
            async for event in streamer.stream(agent, config, content):
                yield event

    except GraphRecursionError:
        logger.error("Orchestrator exceeded maximum reasoning steps for chat_session_id=%s", chat_session_id)
        yield {"event": "error", "data": {"message": "Agent exceeded maximum reasoning steps"}}
    except TimeoutError:
        logger.error("Orchestrator turn timed out for chat_session_id=%s", chat_session_id)
        yield {"event": "error", "data": {"message": "Agent turn timed out"}}
    except Exception as exc:
        logger.error(
            "Orchestrator stream failed for chat_session_id=%s: %s",
            chat_session_id,
            mask_sensitive(str(exc)),
        )
        yield {"event": "error", "data": {"message": classify_llm_error(exc)}}