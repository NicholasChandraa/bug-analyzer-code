"""1:1 port dari backend/src/infra/code-search/ripgrep.ts (`searchAcrossRepos`)."""

import asyncio
import json
from dataclasses import dataclass

from app.config import settings

DEFAULT_MAX_MATCHES_PER_REPO = 50
_SEARCH_TIMEOUT_S = 30
_MAX_OUTPUT_BYTES = 10 * 1024 * 1024


@dataclass(frozen=True)
class SearchMatch:
    repo_path: str
    file_path: str
    line_number: int
    line_content: str


async def search_across_repos(
    query: str,
    repo_paths: list[str],
    max_matches_per_repo: int = DEFAULT_MAX_MATCHES_PER_REPO,
    case_sensitive: bool = False,
) -> list[SearchMatch]:
    results = await asyncio.gather(
        *(_search_one_repo(query, path, max_matches_per_repo, case_sensitive) for path in repo_paths)
    )
    return [match for group in results for match in group]


async def _search_one_repo(
    query: str, repo_path: str, max_matches: int, case_sensitive: bool
) -> list[SearchMatch]:
    args = [
        settings.RIPGREP_PATH,
        "--json",
        "--fixed-strings",
        "--max-count",
        str(max_matches),
        "--case-sensitive" if case_sensitive else "--ignore-case",
        "--",
        query,
        repo_path,
    ]

    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=_SEARCH_TIMEOUT_S)

    # rg keluar dengan exit code 1 kalau simply gak ada hasil - itu bukan error, harus dianggep
    # list kosong. exit code >=2 baru beneran error (bukan dilempar generik lewat run_subprocess,
    # karena itu bakal nganggep exit 1 = gagal juga).
    if process.returncode not in (0, 1):
        raise RuntimeError(f"ripgrep search failed in {repo_path}: {stderr.decode(errors='replace')}")

    return _parse_matches(stdout.decode("utf-8", errors="replace"), repo_path, max_matches)


def _parse_matches(stdout: str, repo_path: str, max_matches: int) -> list[SearchMatch]:
    matches: list[SearchMatch] = []
    for line in stdout.split("\n"):
        if not line:
            continue
        event = json.loads(line)
        if event.get("type") != "match":
            continue
        data = event["data"]
        matches.append(
            SearchMatch(
                repo_path=repo_path,
                file_path=data["path"]["text"],
                line_number=data["line_number"],
                line_content=data["lines"]["text"].rstrip(),
            )
        )
        if len(matches) >= max_matches:
            break
    return matches
