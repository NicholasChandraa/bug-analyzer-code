"""Tool: run_linter_and_tests - jalankan skrip lint & test repo (via pnpm)."""

from langchain.tools import tool

from app.domains.triage.schemas import RunLinterAndTestsArgs
from app.domains.triage.tools._common import get_resolver
from app.infra.verification.sandbox import run_linter_and_tests


@tool(
    "run_linter_and_tests",
    args_schema=RunLinterAndTestsArgs,
    description=(
        "Menjalankan skrip lint dan test milik repositori (via pnpm) dan melaporkan status kelulusan."
    ),
)
async def run_linter_and_tests_tool(repo_slug: str) -> str:
    resolver = get_resolver()
    repo = await resolver.get(repo_slug)
    result = await run_linter_and_tests(repo.local_path)
    return "Skrip linter dan pengujian (test) berhasil." if result.passed else result.output