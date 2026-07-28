"""Tool: git_log_blame - riwayat commit (log) atau pembuat per baris (blame)."""

from langchain.tools import tool

from app.domains.triage.schemas import GitLogBlameArgs
from app.domains.triage.tools._common import get_resolver, resolve_safe_path
from app.infra.code_search.git_history import get_file_blame, get_file_log


@tool(
    "git_log_blame",
    args_schema=GitLogBlameArgs,
    description=(
        "Memeriksa riwayat commit (mode=log) atau pembuat per baris kode (mode=blame) "
        "pada file di repositori."
    ),
)
async def git_log_blame_tool(repo_slug: str, file_path: str, mode: str) -> str:
    resolver = get_resolver()
    local_path = await resolver.get_path(repo_slug)
    resolve_safe_path(local_path, file_path)  # guard-only, untrusted file_path

    if mode == "blame":
        lines = await get_file_blame(local_path, file_path)
        return "\n".join(
            f"{l.line_number} ({l.hash[:7]} {l.author} {l.date}): {l.content}" for l in lines
        )

    entries = await get_file_log(local_path, file_path)
    return "\n".join(f"{e.hash[:7]} {e.date} {e.author}: {e.message}" for e in entries)