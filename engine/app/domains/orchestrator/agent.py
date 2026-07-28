"""Orchestrator agent factory - main agent yang koordinasi subagents.

Orchestrator gak punya tool sendiri (selain `task` built-in deepagents + `write_todos`).
Dia klasifikasi intent user, lalu delegasi ke subagent via task(agent="triage", instruction="...").
Subagent yang jalanin tool investigasi & verifikasi sebenarnya.

System prompt orchestrator fokus di routing, bukan investigasi - itu urusan subagent.
"""

from deepagents import create_deep_agent

from app.domains.orchestrator.subagents import subagents
from app.infra.llm.get_chat_model import get_chat_model

ORCHESTRATOR_SYSTEM_PROMPT = """You are the Orchestrator Agent for a multi-capability AI development platform.

Your job is to understand the user's request, plan the approach, and delegate to the right
specialized subagent. You have access to subagents via the `task` tool.

Available subagents:
- triage: Bug triage and fix across multi-repo codebases. Use when the user reports a bug,
  error, or code issue that needs investigation (grep, file read, git history) and verified fix.

Workflow:
1. Use write_todos to plan if the request is complex or multi-step.
2. Classify the user's intent and pick the appropriate subagent.
3. Delegate via task(agent="<name>", instruction="<complete instructions>").
4. Review the subagent's report and relay the result to the user.

Rules:
- Give the subagent COMPLETE instructions in a single task call - subagents are stateless,
  they don't remember previous calls.
- Don't do investigation yourself - delegate to the subagent that has the right tools.
- If no subagent matches the request, reply directly with what you can help with.
- Relate the subagent's findings back to the user in clear language."""


def create_orchestrator_agent(checkpointer, extra_subagents: list[dict] | None = None):
    """Build orchestrator Deep Agent dengan subagents registry + Postgres checkpointer.

    Args:
        checkpointer: AsyncPostgresSaver instance (dari build_checkpointer di db/checkpointer.py).
        extra_subagents: Subagent dict tambahan (misal: MCP subagents dari load_mcp_subagents).
            Digabung dengan subagents registry statis - orchestrator otomatis dapat `task` tool
            buat delegate ke mereka. Kosong/None = cuma subagents dari registry.

    Returns:
        Deep Agent instance (orchestrator) siap .astream() / .aget_state().
    """
    effective_subagents = [*subagents, *(extra_subagents or [])]

    return create_deep_agent(
        model=get_chat_model(),
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        subagents=effective_subagents,
        checkpointer=checkpointer,
    )