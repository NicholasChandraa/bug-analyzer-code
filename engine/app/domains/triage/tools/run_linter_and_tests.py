"""Tool: run_linter_and_tests - jalankan skrip lint & test repo (via pnpm)."""

import logging

from langchain.tools import tool

from app.domains.triage.schemas import RunLinterAndTestsArgs
from app.domains.triage.tools._common import resolve_repo
from app.infra.verification.sandbox import run_linter_and_tests

logger = logging.getLogger(__name__)


@tool(
    "run_linter_and_tests",
    args_schema=RunLinterAndTestsArgs,
    description=(
        "Menjalankan skrip lint dan test milik repositori (via pnpm) dan melaporkan status kelulusan."
    ),
)
async def run_linter_and_tests_tool(repo_slug: str) -> str:
    logger.info("tool: run_linter_and_tests repo_slug=%s", repo_slug)
    repo = await resolve_repo(repo_slug)
    result = await run_linter_and_tests(repo.local_path)
    logger.info("tool: run_linter_and_tests passed=%s output_length=%s", result.passed, len(result.output))
    return "Skrip linter dan pengujian (test) berhasil." if result.passed else result.output