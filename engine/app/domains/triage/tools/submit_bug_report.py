"""Tool: submit_bug_report - simpan hasil triage terverifikasi ke Backend."""

from langchain.tools import tool, ToolRuntime

from app.domains.triage.schemas import SubmitBugReportArgs
from app.domains.triage.tools._common import get_resolver, resolve_safe_path
from app.infra import backend_client


@tool(
    "submit_bug_report",
    args_schema=SubmitBugReportArgs,
    description=(
        "Panggil ini SEKALI sebagai aksi terakhir, setelah verifikasi "
        "(tsc_no_emit & run_linter_and_tests) lolos, untuk menyimpan perbaikan "
        "sebagai bug report terverifikasi."
    ),
)
async def submit_bug_report_tool(
    repo_slug: str,
    file_path: str,
    reason: str,
    suggested_fix: str,
    runtime: ToolRuntime,
    line_estimate: str | None = None,
) -> str:
    # chatSessionId dari runtime.config.configurable.thread_id (bukan argumen tool) -
    # thread_id di-set service.py jadi str(chatSessionId) saat agent.astream() dipanggil.
    configurable = runtime.config.get("configurable") or {}
    raw_thread_id = configurable.get("thread_id")
    try:
        chat_session_id = int(raw_thread_id) if raw_thread_id is not None else 0
    except (TypeError, ValueError):
        chat_session_id = 0

    if not chat_session_id:
        raise ValueError("thread_id tidak ditemukan di runtime config - gak bisa nyimpen bug report")

    resolver = get_resolver()
    repo = await resolver.get(repo_slug)
    resolve_safe_path(repo.local_path, file_path)  # guard-only, result unused

    await backend_client.submit_bug_report(
        chat_session_id=chat_session_id,
        repository_id=repo.id,
        file_path=file_path,
        line_estimate=line_estimate,
        reason=reason,
        suggested_fix=suggested_fix,
    )
    return "Bug report berhasil disimpan."