"""Triage Agent factory - 1:1 port dari backend/src/domains/triage/triage.agent.ts.

Single-agent (semua 7 tools dipegang langsung main agent, tanpa sub-agent terpisah).
Multi-agent Orchestrator+Sub-Agent design di update.md §5 real tapi BELUM dibangun di
mana pun (TS triage.agent.ts pun masih single-agent hari ini) - sengaja gak digabung
bareng porting bahasa ini, lihat enumerated-wishing-sketch.md Context.
"""

from deepagents import create_deep_agent

from app.domains.triage.tools import triage_tools
from app.infra.llm.get_chat_model import get_chat_model

SYSTEM_PROMPT = """You are the Smart Bug Triage Agent for a multi-repo codebase.

Given a user's bug report (text, optionally a screenshot description), you must:
1. Use write_todos to plan your investigation.
2. Investigate the root cause yourself: use ripgrep_search to locate relevant code, read_repo_file to inspect it, and git_log_blame/trace_dependencies to understand history and blast radius.
3. Once you know the root cause, draft a unified diff patch for the affected file(s).
4. Verify the patch by running tsc_no_emit and run_linter_and_tests against the affected repo.
5. If verification fails, read the error trace, revise the patch, and repeat step 4 until it passes, or you determine it can't be auto-fixed.
6. Once verification passes, call submit_bug_report exactly once with the repo slug, affected file path, root cause, and the diff - this is how the fix gets saved.
7. Reply to the user with the final verified fix: repo/files touched, root cause summary, and the diff.

Never call submit_bug_report before tsc_no_emit and run_linter_and_tests have both passed."""


def create_triage_agent(checkpointer):
    """Build single-agent Deep Agent dengan 7 tools + Postgres checkpointer.

    Args:
        checkpointer: AsyncPostgresSaver instance (dari build_checkpointer di db/checkpointer.py).

    Returns:
        Deep Agent instance siap .astream() / .aget_state().
    """
    return create_deep_agent(
        model=get_chat_model(),
        tools=triage_tools,
        system_prompt=SYSTEM_PROMPT,
        checkpointer=checkpointer,
    )