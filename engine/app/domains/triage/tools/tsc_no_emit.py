"""Tool: tsc_no_emit - verifikasi 0 error tipe data TypeScript."""

import logging

from langchain.tools import tool

from app.domains.triage.schemas import TscNoEmitArgs
from app.domains.triage.tools._common import resolve_repo
from app.infra.verification.sandbox import run_type_check

logger = logging.getLogger(__name__)


@tool(
    "tsc_no_emit",
    args_schema=TscNoEmitArgs,
    description=(
        "Menjalankan `npx tsc --noEmit` pada repositori terdaftar untuk memverifikasi "
        "0 error tipe data TypeScript."
    ),
)
async def tsc_no_emit_tool(repo_slug: str) -> str:
    logger.info("tool: tsc_no_emit repo_slug=%s", repo_slug)
    repo = await resolve_repo(repo_slug)
    result = await run_type_check(repo.local_path)
    logger.info("tool: tsc_no_emit passed=%s output_length=%s", result.passed, len(result.output))
    return "Pemeriksaan tipe data TypeScript berhasil dengan 0 error." if result.passed else result.output