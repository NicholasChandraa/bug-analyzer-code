"""Orchestrator agent factory - main agent yang koordinasi subagents.

Orchestrator gak punya tool sendiri (selain `task` built-in deepagents + `write_todos`).
Dia klasifikasi intent user, lalu delegasi ke subagent via task(agent="<name>", instruction="...").
Subagent yang jalanin tool investigasi & verifikasi sebenarnya.

System prompt orchestrator fokus di routing, bukan investigasi - itu urusan subagent.

Subagent config di-import dari domain masing-masing (triage/agent.py, mcp/agent.py).
Orchestrator cuma assemble — nambah subagent baru = bikin domain baru + import di sini.
"""

from deepagents import create_deep_agent

from app.domains.mcp.agent import build_mcp_subagent
from app.domains.triage.agent import TRIAGE_SUBAGENT
from app.infra.llm.get_chat_model import get_chat_model

ORCHESTRATOR_SYSTEM_PROMPT = """You are the Orchestrator Agent for a multi-capability AI development platform.

Your job is to understand the user's request, plan the approach, and delegate to the right
specialized subagent. You have access to subagents via the `task` tool — the tool description
lists all available subagents and when to use each one.

Workflow:
1. Use write_todos to plan if the request is complex or multi-step.
2. Classify the user's intent and pick the appropriate subagent based on its description.
3. Delegate via task(agent="<name>", instruction="<complete instructions>").
4. Review the subagent's report and relay the result to the user.

Rules:
- Give the subagent COMPLETE instructions in a single task call — subagents are stateless,
  they don't remember previous calls.
- Don't do investigation yourself — delegate to the subagent that has the right tools.
- For general questions or explanations that don't require tools, reply directly.
- Relate the subagent's findings back to the user in clear language."""


async def create_orchestrator_agent(checkpointer):
    """Build orchestrator Deep Agent dengan subagents + Postgres checkpointer.

    Subagent config di-import dari domain masing-masing. Triage static (dict langsung),
    MCP dynamic (tools di-load saat startup via async builder).

    Args:
        checkpointer: AsyncPostgresSaver instance (dari build_checkpointer di db/checkpointer.py).

    Returns:
        Deep Agent instance (orchestrator) siap .astream() / .aget_state().
    """
    mcp_subagent = await build_mcp_subagent()

    return create_deep_agent(
        model=get_chat_model(),
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        subagents=[
            TRIAGE_SUBAGENT,
            mcp_subagent,
        ],
        checkpointer=checkpointer,
    )