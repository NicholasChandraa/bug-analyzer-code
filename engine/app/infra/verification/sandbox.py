"""1:1 port dari runTypeCheck/runLinterAndTests di backend/src/infra/verification/sandbox.ts.

installDependencies() SENGAJA gak diporting kesini - itu tetap permanen di TypeScript
(dipicu admin pas sync repo, bukan tool yang dipanggil agent)."""

import asyncio
import json
from pathlib import Path

from app.infra.proc import CommandResult, run_subprocess
from app.infra.security.path_guard import validate_path_boundary

TIMEOUT_SECONDS = 5 * 60
MAX_OUTPUT_BYTES = 10 * 1024 * 1024


async def run_type_check(repo_path: str) -> CommandResult:
    """Jalanin `npx tsc --noEmit` di host (cwd=repo_path). Gak ada Docker lagi - repo selalu lokal."""
    validated = validate_path_boundary(repo_path, repo_path)
    return await run_subprocess(
        ["npx tsc --noEmit"], cwd=validated, timeout_s=TIMEOUT_SECONDS,
        max_output_bytes=MAX_OUTPUT_BYTES, shell=True,
    )


async def run_linter_and_tests(repo_path: str) -> CommandResult:
    """Jalanin skrip lint & test (pnpm) di host (cwd=repo_path). Gak ada Docker lagi."""
    validated = validate_path_boundary(repo_path, repo_path)
    scripts = await _get_package_scripts(validated)
    commands = [
        cmd for cmd, present in (
            ("pnpm run lint", scripts.get("lint")),
            ("pnpm test", scripts.get("test")),
        ) if present
    ]

    if not commands:
        return CommandResult(True, "Tidak ditemukan skrip lint atau test di package.json - dilewati.")

    command_str = " && ".join(commands)
    return await run_subprocess(
        [command_str], cwd=validated, timeout_s=TIMEOUT_SECONDS,
        max_output_bytes=MAX_OUTPUT_BYTES, shell=True,
    )


async def _get_package_scripts(repo_path: str) -> dict:
    try:
        raw = await asyncio.to_thread((Path(repo_path) / "package.json").read_text, encoding="utf-8")
        return json.loads(raw).get("scripts") or {}
    except Exception:
        return {}
