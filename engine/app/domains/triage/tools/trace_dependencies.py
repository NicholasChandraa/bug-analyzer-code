"""Tool: trace_dependencies - cari file yang meng-import/modul tertentu."""

from langchain.tools import tool

from app.domains.triage.schemas import TraceDependenciesArgs
from app.domains.triage.tools._common import get_resolver
from app.infra.code_search.ripgrep import search_across_repos


@tool(
    "trace_dependencies",
    args_schema=TraceDependenciesArgs,
    description=(
        "Mencari file yang meng-import atau membutuhkan modul/path relatif tertentu "
        "di dalam repositori."
    ),
)
async def trace_dependencies_tool(repo_slug: str, module_path: str) -> str:
    resolver = get_resolver()
    local_path = await resolver.get_path(repo_slug)
    matches = await search_across_repos(module_path, [local_path])

    if not matches:
        return f'Tidak ditemukan referensi import/export untuk "{module_path}".'
    return "\n".join(f"{m.file_path}:{m.line_number}: {m.line_content}" for m in matches)