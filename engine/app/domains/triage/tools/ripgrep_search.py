"""Tool: ripgrep_search - cari kata kunci lintas repo di disk."""

from langchain.tools import tool

from app.domains.triage.schemas import RipgrepSearchArgs
from app.domains.triage.tools._common import get_resolver
from app.infra.code_search.ripgrep import search_across_repos


@tool(
    "ripgrep_search",
    args_schema=RipgrepSearchArgs,
    description=(
        "Mencari kata kunci secara harfiah di dalam satu atau beberapa repositori terdaftar di disk. "
        "Kosongkan repoSlugs untuk mencari di semua repositori."
    ),
)
async def ripgrep_search_tool(query: str, repo_slugs: list[str] | None = None) -> str:
    resolver = get_resolver()
    repos = await resolver.list(repo_slugs)
    if not repos:
        return "Tidak ada repositori terdaftar yang cocok."

    matches = await search_across_repos(query, [r.local_path for r in repos])
    if not matches:
        return f'Tidak ada hasil pencocokan untuk kata kunci "{query}"'

    path_to_slug = {r.local_path: r.slug for r in repos}
    return "\n".join(
        f"[{path_to_slug.get(m.repo_path, m.repo_path)}] {m.file_path}:{m.line_number}: {m.line_content}"
        for m in matches
    )