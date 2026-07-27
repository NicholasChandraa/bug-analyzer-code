"""
Satu-satunya tempat yang menjalankan subprocess di seluruh Engine (mirror `runInSandbox`/`execFileAsync`
di TS - masing-masing jadi satu choke point di file-nya). Pakai `asyncio.create_subprocess_exec`, bukan
`anyio.to_thread.run_sync` yang bungkus `subprocess.run` biasa - kalau request dari Backend di-cancel
di tengah jalan (client disconnect/timeout), coroutine yang nunggu di `create_subprocess_exec` bisa
nangkep cancellation dan `process.kill()` proses OS aslinya (docker run bisa jalan 1-3+ menit). Blocking
call yang dibungkus thread pool gak bisa dibunuh pas di-cancel - subprocess-nya jadi orphan.
"""

import asyncio
from typing import NamedTuple

READ_CHUNK_SIZE = 64 * 1024


class CommandResult(NamedTuple):
    passed: bool
    output: str


async def run_subprocess(
    cmd: list[str],
    *,
    cwd: str | None,
    timeout_s: float,
    max_output_bytes: int,
    shell: bool = False,
) -> CommandResult:
    if shell:
        process = await asyncio.create_subprocess_shell(
            cmd[0], cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
    else:
        process = await asyncio.create_subprocess_exec(
            *cmd, cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

    try:
        async with asyncio.timeout(timeout_s):
            stdout, stderr, overflowed = await _communicate_capped(process, max_output_bytes)
            if overflowed:
                await process.wait()
                return CommandResult(False, f"Command output exceeded {max_output_bytes} bytes - process killed")
            returncode = await process.wait()
    except TimeoutError:
        process.kill()
        await process.wait()
        return CommandResult(False, f"Command timed out after {timeout_s}s")

    return CommandResult(returncode == 0, stdout + stderr)


async def _communicate_capped(process: asyncio.subprocess.Process, max_bytes: int) -> tuple[str, str, bool]:
    """Baca stdout+stderr bersamaan, chunk-demi-chunk. Begitu total gabungan ngelewatin max_bytes,
    BUNUH proses-nya (bukan cuma berhenti baca) - kalau cuma berhenti baca tapi child masih nulis,
    pipe buffer OS bisa penuh dan child block nulis selamanya, bikin process.wait() hang. Ini mirror
    perilaku Node `execFile({ maxBuffer })` yang juga kill child-nya begitu limit kelewatan."""
    total = 0
    overflowed = False

    async def read_stream(stream: asyncio.StreamReader | None, chunks: list[bytes]) -> None:
        nonlocal total, overflowed
        if stream is None:
            return
        while True:
            chunk = await stream.read(READ_CHUNK_SIZE)
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
            if total >= max_bytes:
                overflowed = True
                process.kill()
                break

    stdout_chunks: list[bytes] = []
    stderr_chunks: list[bytes] = []
    await asyncio.gather(read_stream(process.stdout, stdout_chunks), read_stream(process.stderr, stderr_chunks))

    stdout = b"".join(stdout_chunks).decode("utf-8", errors="replace")
    stderr = b"".join(stderr_chunks).decode("utf-8", errors="replace")
    return stdout, stderr, overflowed
