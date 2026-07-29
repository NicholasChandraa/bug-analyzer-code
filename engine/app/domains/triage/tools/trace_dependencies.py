"""Tool: trace_dependencies - cari file yang meng-import/modul tertentu."""

import logging

from langchain.tools import tool

from app.domains.triage.schemas import TraceDependenciesArgs
from app.domains.triage.tools._common import resolve_repo_path
from app.infra.code_search.ripgrep import search_across_repos

logger = logging.getLogger(__name__)


@tool(
    "trace_dependencies",
    args_schema=TraceDependenciesArgs,
    description=(
        "Mencari file yang meng-import atau membutuhkan modul/path relatif tertentu "
        "di dalam repositori."
    ),
)
async def trace_dependencies_tool(repo_slug: str, module_path: str) -> str:
    logger.info("tool: trace_dependencies repo_slug=%s module_path=%s", repo_slug, module_path)
    local_path = await resolve_repo_path(repo_slug)
    matches = await search_across_repos(module_path, [local_path])
    logger.info("tool: trace_dependencies matches=%s", len(matches))

    if not matches:
        return f'Tidak ditemukan referensi import/export untuk "{module_path}".'
    return "\n".join(f"{m.file_path}:{m.line_number}: {m.line_content}" for m in matches)