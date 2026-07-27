"""1:1 port (behavior, bukan wire format internal) dari backend/src/infra/code-search/git-history.ts."""

import re
from dataclasses import dataclass
from datetime import UTC, datetime

from app.infra.proc import run_subprocess

_TIMEOUT_S = 30
_MAX_OUTPUT_BYTES = 10 * 1024 * 1024

# Separator ASCII (unit/record separator) - bukan reproduksi marker internal simple-git,
# cukup pastiin field & flag git command-nya sama (hash, author, ISO date, message, --follow).
_FIELD_SEP = "\x1f"
_RECORD_SEP = "\x1e"

_HEADER_RE = re.compile(r"^([0-9a-f]{40}) \d+ (\d+)")


@dataclass(frozen=True)
class LogEntry:
    hash: str
    author: str
    date: str
    message: str


@dataclass(frozen=True)
class BlameLine:
    line_number: int
    hash: str
    author: str
    date: str
    content: str


async def get_file_log(repo_path: str, file_path: str, max_count: int = 20) -> list[LogEntry]:
    result = await run_subprocess(
        [
            "git", "-C", repo_path, "log", f"--max-count={max_count}", "--follow",
            f"--pretty=format:%H{_FIELD_SEP}%aN{_FIELD_SEP}%aI{_FIELD_SEP}%s{_RECORD_SEP}",
            "--", file_path,
        ],
        cwd=None, timeout_s=_TIMEOUT_S, max_output_bytes=_MAX_OUTPUT_BYTES,
    )
    if not result.passed:
        raise RuntimeError(f"Failed to read git log for {file_path} in {repo_path}: {result.output}")

    entries: list[LogEntry] = []
    for record in result.output.split(_RECORD_SEP):
        record = record.strip("\n")
        if not record:
            continue
        h, author, date, message = record.split(_FIELD_SEP)
        entries.append(LogEntry(hash=h, author=author, date=date, message=message))
    return entries


async def get_file_blame(repo_path: str, file_path: str) -> list[BlameLine]:
    # "--" wajib ada biar file_path (bisa dari argumen tool/untrusted) yang kebetulan diawali "-"
    # gak kebaca sebagai flag git.
    result = await run_subprocess(
        ["git", "-C", repo_path, "blame", "--line-porcelain", "--", file_path],
        cwd=None, timeout_s=_TIMEOUT_S, max_output_bytes=_MAX_OUTPUT_BYTES,
    )
    if not result.passed:
        raise RuntimeError(f"Failed to blame {file_path} in {repo_path}: {result.output}")
    return _parse_blame_porcelain(result.output)


def _parse_blame_porcelain(raw: str) -> list[BlameLine]:
    result: list[BlameLine] = []
    current_hash = ""
    current_author = ""
    current_date = ""
    line_number = 0

    for line in raw.split("\n"):
        header = _HEADER_RE.match(line)
        if header:
            current_hash = header.group(1)
            line_number = int(header.group(2))
            continue

        if line.startswith("author "):
            current_author = line[len("author "):]
        elif line.startswith("author-time "):
            epoch_seconds = int(line[len("author-time "):])
            current_date = datetime.fromtimestamp(epoch_seconds, tz=UTC).isoformat().replace("+00:00", "Z")
        elif line.startswith("\t"):
            result.append(BlameLine(
                line_number=line_number, hash=current_hash, author=current_author,
                date=current_date, content=line[1:],
            ))

    return result
