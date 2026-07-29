"""Tool: git_log_blame - riwayat commit (log) atau pembuat per baris (blame)."""

import logging

from langchain.tools import tool

from app.domains.triage.schemas import GitLogBlameArgs
from app.domains.triage.tools._common import resolve_repo_path, resolve_safe_path
from app.infra.code_search.git_history import get_file_blame, get_file_log

logger = logging.getLogger(__name__)


@tool(
    "git_log_blame",
    args_schema=GitLogBlameArgs,
    description=(
        "Memeriksa riwayat commit (mode=log) atau pembuat per baris kode (mode=blame) "
        "pada file di repositori."
    ),
)
async def git_log_blame_tool(repo_slug: str, file_path: str, mode: str) -> str:
    logger.info("tool: git_log_blame repo_slug=%s file_path=%s mode=%s", repo_slug, file_path, mode)
    local_path = await resolve_repo_path(repo_slug)
    resolve_safe_path(local_path, file_path)  # guard-only, untrusted file_path

    if mode == "blame":
        lines = await get_file_blame(local_path, file_path)
        logger.info("tool: git_log_blame blame_lines=%s", len(lines))
        return "\n".join(
            f"{l.line_number} ({l.hash[:7]} {l.author} {l.date}): {l.content}" for l in lines
        )

    entries = await get_file_log(local_path, file_path)
    logger.info("tool: git_log_blame log_entries=%s", len(entries))
    return "\n".join(f"{e.hash[:7]} {e.date} {e.author}: {e.message}" for e in entries)