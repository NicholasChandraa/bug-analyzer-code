"""Tool: read_repo_file - baca isi file (opsional rentang baris) dari repo di disk."""

import asyncio
import logging

from langchain.tools import tool

from app.domains.triage.schemas import ReadRepoFileArgs
from app.domains.triage.tools._common import resolve_repo_path, resolve_safe_path

logger = logging.getLogger(__name__)


@tool(
    "read_repo_file",
    args_schema=ReadRepoFileArgs,
    description="Membaca isi file (opsional berdasarkan rentang baris) dari repositori terdaftar di disk.",
)
async def read_repo_file_tool(
    repo_slug: str, file_path: str, start_line: int | None = None, end_line: int | None = None
) -> str:
    logger.info("tool: read_repo_file repo_slug=%s file_path=%s start=%s end=%s", repo_slug, file_path, start_line, end_line)
    local_path = await resolve_repo_path(repo_slug)
    absolute_path = resolve_safe_path(local_path, file_path)

    content = await asyncio.to_thread(_read_file_sync, absolute_path)
    logger.info("tool: read_repo_file read_bytes=%s", len(content))

    if not start_line and not end_line:
        return content

    lines = content.split("\n")
    start = max(1, start_line or 1)
    end = min(len(lines), end_line or len(lines))

    return "\n".join(f"{start + i}: {line}" for i, line in enumerate(lines[start - 1 : end]))


def _read_file_sync(path: str) -> str:
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()