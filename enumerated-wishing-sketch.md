# Plan: Port Triage Agent & Tools from Backend (TS) to Engine (Python/FastAPI)

## Context

The project is mid-migration from a single Hono/TypeScript backend to a 3-service architecture
(`frontend` + `backend` + `engine`), already documented in `DEVELOPMENT.md`/`flow-bisnis.md`/`update.md`.
The user chose Python for `engine/` specifically because the LangGraph/DeepAgents + future-RAG ecosystem
is more mature there, and explicitly decided tools + the Docker verification sandbox move fully into
Python (not delegated back to Backend over HTTP) — only two narrow HTTP calls flow Engine→Backend
(resolve repo info, submit bug report), and the reverse Backend→Engine call is "invoke the agent for
this message." `engine/` already has `uv`+Granian+FastAPI scaffolded and boots (`GET /` returns
`{"status":"ok"}`). This plan is the concrete file-by-file migration of the **currently-running,
proven, single-agent** TypeScript triage agent/tools to Python — confirmed with the user: build the
single-agent port now; the multi-agent Orchestrator+Sub-Agent design in `update.md` §5 is real but
**not yet built anywhere** (TS `triage.agent.ts` is still single-agent today) and is explicitly
out of scope for this pass, to avoid combining a language port and an architecture change in one
risky step.

Everything below was verified against the actual current file contents (not assumed) and against the
actual installed package versions in `engine/.venv` (`deepagents 0.6.12`, `langgraph 1.2.9`,
`langchain-core 1.5.1`, `fastapi 0.140.2`, `engine/uv.lock`).

## What stays in TypeScript (do not touch)

- `backend/src/infra/code-search/git.ts` (clone/pull), `installDependencies()` in
  `backend/src/infra/verification/sandbox.ts` (admin-triggered `pnpm install`, network-allowed sandbox) —
  both permanent, unrelated to the agent.
- `backend/src/domains/repository/*`, `backend/src/domains/auth/*`, `backend/src/domains/user/*` — untouched
  except the two new internal endpoints described below.

---

## Part A — New Python code in `engine/`

File tree (build in this order — each layer only depends on layers above it):

```
engine/
  main.py                                   # rewrite: FastAPI app + lifespan (pool, checkpointer, agent, httpx client)
  app/
    config.py                               # pydantic-settings
    infra/
      proc.py                               # shared async subprocess runner (timeout + output cap + kill-on-cancel)
      logging.py                            # JSON formatter + contextvars request-id
      security/path_guard.py                # validate_path_boundary() — 1:1 port
      code_search/ripgrep.py                # search_across_repos() — 1:1 port
      code_search/git_history.py            # get_file_log/get_file_blame() — 1:1 port (raw subprocess, not GitPython)
      verification/sandbox.py               # run_type_check/run_linter_and_tests — 1:1 port (install NOT ported)
      llm/get_chat_model.py                 # ChatOpenAI factory — 1:1 port
      db/checkpointer.py                    # AsyncPostgresSaver + AsyncConnectionPool builder (new, no TS equivalent)
      backend_client.py                     # httpx calls to Backend's 2 new internal endpoints
    domains/triage/
      schemas.py                            # Pydantic wire models (CamelModel) + tool-arg models
      tools.py                              # the 7 tools, 1:1 behavior port
      agent.py                              # create_triage_agent() + verbatim SYSTEM_PROMPT
      service.py                            # invoke_agent() — todos/message diffing (NEW LOCATION, moved from TS routes)
      routes.py                             # POST /agent/invoke → NDJSON StreamingResponse
```

### A1. `app/infra/proc.py` — shared subprocess primitive (build first, everything else uses it)

Single choke point for all subprocess execution (mirrors how `sandbox.ts`'s `runInSandbox` and
`ripgrep.ts`'s `execFileAsync` are each their file's one choke point). Use
**`asyncio.create_subprocess_exec`**, not `anyio.to_thread.run_sync` wrapping blocking `subprocess.run` —
if Backend's HTTP call to Engine is cancelled mid-turn (client disconnect/timeout), the coroutine sitting
on `create_subprocess_exec` can catch cancellation and `process.kill()` the real OS process (docker run
can last 1–3+ minutes); a thread-pool-wrapped blocking call cannot be killed on cancellation and would
orphan the subprocess.

```python
import asyncio

class CommandResult(NamedTuple):
    passed: bool
    output: str

async def run_subprocess(cmd: list[str], *, cwd: str | None, timeout_s: float, max_output_bytes: int,
                          shell: bool = False) -> CommandResult:
    if shell:
        process = await asyncio.create_subprocess_shell(cmd[0], cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    else:
        process = await asyncio.create_subprocess_exec(*cmd, cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        async with asyncio.timeout(timeout_s):
            stdout, stderr = await _read_capped_both(process, max_output_bytes)
            returncode = await process.wait()
    except TimeoutError:
        process.kill()
        await process.wait()
        return CommandResult(False, f"Command timed out after {timeout_s}s")
    return CommandResult(returncode == 0, stdout + stderr)
```

`_read_capped_both` reads stdout/stderr in chunks (e.g. 64KB) and stops once `max_output_bytes` combined
is hit, killing the process early — mirrors Node's `execFile({maxBuffer})` behavior (kills on overflow,
doesn't buffer unboundedly). Every other infra module below calls this instead of rolling its own
`communicate()`.

### A2. `app/infra/security/path_guard.py` — no deps

1:1 port of `validatePathBoundary`. **Exact semantics matter** — case-insensitive AND forward-slash
normalized on **both** platforms (the TS version doesn't branch on OS; don't "fix" that in Python):

```python
import os

class PathBoundaryError(Exception):
    pass

def validate_path_boundary(target_path: str, allowed_repo_local_path: str) -> str:
    absolute_allowed = os.path.abspath(allowed_repo_local_path)
    absolute_target = (
        os.path.abspath(target_path) if os.path.isabs(target_path)
        else os.path.abspath(os.path.join(absolute_allowed, target_path))
    )
    normalized_allowed = absolute_allowed.replace("\\", "/").lower()
    normalized_target = absolute_target.replace("\\", "/").lower()
    allowed_prefix = normalized_allowed if normalized_allowed.endswith("/") else f"{normalized_allowed}/"
    if normalized_target != normalized_allowed and not normalized_target.startswith(allowed_prefix):
        raise PathBoundaryError(
            f'Access denied: Target path "{target_path}" is outside the allowed repository boundary "{allowed_repo_local_path}"'
        )
    return absolute_target  # original case preserved, only the comparison is lower-cased
```

### A3. `app/infra/code_search/ripgrep.py` — depends on A1

1:1 port of `searchAcrossRepos`: same flag order, `--fixed-strings` always, `--` before the (untrusted)
query, exit code 1 = empty result (not an error), concurrent across repos via `asyncio.gather`. Route
through `run_subprocess` from A1 (gives it the output cap for free — the TS original enforces
`maxBuffer: 10MB` on this same call, so don't drop that property in translation).

```python
DEFAULT_MAX_MATCHES_PER_REPO = 50

async def search_across_repos(query: str, repo_paths: list[str], max_matches_per_repo=50, case_sensitive=False):
    results = await asyncio.gather(*(_search_one_repo(query, p, max_matches_per_repo, case_sensitive) for p in repo_paths))
    return [m for group in results for m in group]

async def _search_one_repo(query, repo_path, max_matches, case_sensitive):
    args = ["rg", "--json", "--fixed-strings", "--max-count", str(max_matches),
            "--case-sensitive" if case_sensitive else "--ignore-case", "--", query, repo_path]
    result = await run_subprocess(args, cwd=None, timeout_s=30, max_output_bytes=10 * 1024 * 1024)
    # rg exit code 1 (no matches) surfaces as passed=False here — check output/returncode distinction,
    # or special-case: rerun without raising, since run_subprocess conflates "failed" with "no matches".
    ...  # parse NDJSON stdout, filter type=="match", cap at max_matches (see below)
```

**Correction needed to A1's generic runner for this one caller**: `run_subprocess` treats any non-zero
exit as `passed=False`, but ripgrep's exit code 1 ("no matches") is not a failure — it must produce an
empty match list, not be conflated with a real ripgrep error (exit ≥2). Options: (a) give
`_search_one_repo` its own thin subprocess call that checks `returncode in (0, 1)` explicitly before
raising, bypassing the generic pass/fail runner for this one case, or (b) add an `allowed_exit_codes`
param to `run_subprocess`. Pick (a) — it's a one-off exception specific to ripgrep's exit-code
convention, not worth generalizing the shared helper for.

**Deployment requirement (not optional):** the TS side bundled `rg` via `@vscode/ripgrep`; there is no
equivalent trustworthy PyPI package. `ripgrep` must be installed as a system binary wherever Engine runs
(`choco install ripgrep` / `winget install BurntSushi.ripgrep.MSVC` on the Windows dev box — already
confirmed installed earlier this session; `apt-get install ripgrep` in any Linux/Docker deployment image).
Add `RIPGREP_PATH: str = "rg"` to `config.py` as an override knob, default assumes it's on `PATH`.

### A4. `app/infra/code_search/git_history.py` — depends on A1

1:1 port of `git-history.ts`'s **observable behavior** (exact fields, exact `--` safety), not its
internal wire format (simple-git's field markers are that library's private implementation detail — no
need to reproduce them, `git log --pretty=format:...` with a Python-chosen delimiter is fine as long as
the 4 fields — hash, author, ISO date, message — and the `--follow` flag match).

```python
async def get_file_log(repo_path: str, file_path: str, max_count: int = 20) -> list[LogEntry]:
    result = await run_subprocess(
        ["git", "-C", repo_path, "log", f"--max-count={max_count}", "--follow",
         "--pretty=format:%H%x1f%aN%x1f%aI%x1f%s%x1e", "--", file_path],
        cwd=None, timeout_s=30, max_output_bytes=10 * 1024 * 1024,
    )
    if not result.passed:
        raise RuntimeError(f"Failed to read git log for {file_path} in {repo_path}: {result.output}")
    return [_parse_log_record(r) for r in result.output.split("\x1e") if r.strip("\n")]

async def get_file_blame(repo_path: str, file_path: str) -> list[BlameLine]:
    result = await run_subprocess(
        ["git", "-C", repo_path, "blame", "--line-porcelain", "--", file_path],  # "--" guards a filePath starting with "-"
        cwd=None, timeout_s=30, max_output_bytes=10 * 1024 * 1024,
    )
    if not result.passed:
        raise RuntimeError(f"Failed to blame {file_path} in {repo_path}: {result.output}")
    return _parse_blame_porcelain(result.output)
```

`_parse_blame_porcelain` — same regex `^([0-9a-f]{40}) \d+ (\d+)` for the header, accumulate `author `
and `author-time ` (epoch seconds → `datetime.fromtimestamp(x, tz=timezone.utc).isoformat()`), tab-prefixed
lines are content. This is line-for-line the same parsing algorithm as `git-history.ts`'s
`parseBlamePorcelain`, just Python syntax.

**Note on `gitpython`**: it's currently a direct dependency in `pyproject.toml` (added ahead of this
plan) but this design deliberately uses raw subprocess for git, matching the TS original's own choice
(`execFileAsync`/`simple-git`, not a heavier object-relational git library) and keeping ripgrep/git/docker
on one consistent execution primitive (A1). Recommend removing `gitpython` from `pyproject.toml` once
this file is in — it will otherwise sit unused.

### A5. `app/infra/verification/sandbox.py` — depends on A1, A2

1:1 port of **only** `runTypeCheck`/`runLinterAndTests` (the two functions the agent's tools call).
**`installDependencies` is explicitly out of scope — do not port it, it stays in TypeScript permanently.**

```python
TIMEOUT_SECONDS = 5 * 60
MAX_OUTPUT_BYTES = 10 * 1024 * 1024
SANDBOX_IMAGE = "node:20-slim"
PREPARE_PNPM = "corepack enable && corepack prepare pnpm@latest --activate"

async def run_type_check(repo_path: str, is_local_mode: bool = False) -> CommandResult:
    validated = validate_path_boundary(repo_path, repo_path)
    if is_local_mode:
        return await run_subprocess(["npx tsc --noEmit"], cwd=validated, timeout_s=TIMEOUT_SECONDS,
                                     max_output_bytes=MAX_OUTPUT_BYTES, shell=True)
    return await _run_in_docker(validated, "npx tsc --noEmit", allow_network=False)

async def run_linter_and_tests(repo_path: str, is_local_mode: bool = False) -> CommandResult:
    validated = validate_path_boundary(repo_path, repo_path)
    scripts = await _get_package_scripts(validated)
    commands = [c for c, present in (("pnpm run lint", scripts.get("lint")), ("pnpm test", scripts.get("test"))) if present]
    if not commands:
        return CommandResult(True, "Tidak ditemukan skrip lint atau test di package.json - dilewati.")
    command_str = " && ".join(commands)
    if is_local_mode:
        return await run_subprocess([command_str], cwd=validated, timeout_s=TIMEOUT_SECONDS,
                                     max_output_bytes=MAX_OUTPUT_BYTES, shell=True)
    return await _run_in_docker(validated, f"{PREPARE_PNPM} && {command_str}", allow_network=False)

async def _run_in_docker(repo_path: str, shell_command: str, *, allow_network: bool) -> CommandResult:
    args = ["docker", "run", "--rm",
            *([] if allow_network else ["--network", "none"]),
            "--memory", "2g", "--cpus", "2", "--pids-limit", "256",
            "-v", f"{repo_path}:/repo", "-w", "/repo", SANDBOX_IMAGE, "sh", "-c", shell_command]
    return await run_subprocess(args, cwd=None, timeout_s=TIMEOUT_SECONDS, max_output_bytes=MAX_OUTPUT_BYTES)

async def _get_package_scripts(repo_path: str) -> dict:
    try:
        raw = await asyncio.to_thread((Path(repo_path) / "package.json").read_text, encoding="utf-8")
        return json.loads(raw).get("scripts") or {}
    except Exception:
        return {}
```

All Docker flags (`--rm --network none --memory 2g --cpus 2 --pids-limit 256 -v repo:/repo -w /repo
node:20-slim`) and the `corepack enable && corepack prepare pnpm@latest --activate &&` prefix (sandboxed
runs only, matching TS) are preserved exactly — this is the security-reviewed part of the system, don't
improvise here.

### A6. `app/infra/llm/get_chat_model.py` — depends on `config.py`

```python
from langchain_openai import ChatOpenAI

def get_chat_model() -> ChatOpenAI:
    return ChatOpenAI(api_key=settings.LLM_API_KEY, model=settings.LLM_MODEL, base_url=settings.LLM_BASE_URL)
```

### A7. `app/infra/db/checkpointer.py` — new, no TS equivalent

**Do not use `AsyncPostgresSaver.from_conn_string()`** — it opens exactly one `AsyncConnection`, which
serializes every checkpoint read/write across all concurrent chat sessions onto one connection. Build a
real pool and pass it to the constructor instead (a documented, supported usage):

```python
from contextlib import asynccontextmanager
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

@asynccontextmanager
async def build_checkpointer(database_url: str, max_size: int = 10):
    pool = AsyncConnectionPool(
        conninfo=database_url, max_size=max_size, open=False,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    )
    await pool.open()
    try:
        yield AsyncPostgresSaver(conn=pool)
    finally:
        await pool.close()
```

**Required dependency fix, verified against `engine/uv.lock`**: `langgraph-checkpoint-postgres` currently
pulls in bare `psycopg` (pure-Python, needs system libpq) with **no `psycopg[binary]` wheel anywhere in
the lockfile**. On the Windows dev box and any minimal prod container, importing
`langgraph.checkpoint.postgres.aio` will raise `ImportError: no pq wrapper available` without this. Fix
by adding to `engine/pyproject.toml`:

```toml
"psycopg[binary,pool]>=3.3",
```

then `uv sync`.

### A8. `app/domains/triage/schemas.py`

Two distinct families — don't conflate them: **wire schemas** (Backend↔Engine JSON, camelCase alias so
the wire format matches the rest of the codebase's DTO convention) vs **tool-arg schemas** (LLM-facing,
plain snake_case, no requirement to mirror TS field names since the LLM only ever sees whatever we hand it).

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class AgentInvokeRequest(CamelModel):
    chat_session_id: int
    content: str

class RepositoryDTO(CamelModel):
    id: int
    slug: str
    source_type: Literal["remote", "local"]
    local_path: str
    default_branch: str
```

Plus one Pydantic `BaseModel` args-schema per tool (snake_case fields: `query`/`repo_slugs`,
`repo_slug`/`file_path`/`start_line`/`end_line`, etc.) — straightforward field-for-field translations of
each tool's existing Zod schema, described in A9.

### A9. `app/infra/backend_client.py` — depends on A8

**Two repo-resolution calls are needed, not one** — tracing `resolveRepoPaths(slugs?)` in the TS tools
shows `ripgrep_search` needs "list all registered repos" when `repoSlugs` is omitted, while every other
tool needs a single "throw if this slug doesn't exist" lookup. Collapsing into one endpoint loses either
the 404 semantics or the list-all capability.

```python
_client = httpx.AsyncClient(base_url=settings.BACKEND_URL, timeout=httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0),
                             transport=httpx.AsyncHTTPTransport(retries=2))

async def resolve_repository_by_slug(slug: str) -> RepositoryDTO | None:
    response = await _client.get(f"/api/repositories/internal/by-slug/{slug}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return RepositoryDTO.model_validate(response.json()["repository"])

async def list_repositories(slugs: list[str] | None = None) -> list[RepositoryDTO]:
    params = {"slugs": ",".join(slugs)} if slugs else None
    response = await _client.get("/api/repositories/internal", params=params)
    response.raise_for_status()
    return [RepositoryDTO.model_validate(r) for r in response.json()["repositories"]]

async def submit_bug_report(*, chat_session_id: int, repository_id: int, file_path: str,
                             line_estimate: str | None, reason: str, suggested_fix: str) -> int:
    response = await _client.post("/api/triage/internal/bug-reports", json={
        "chatSessionId": chat_session_id, "repositoryId": repository_id, "filePath": file_path,
        "lineEstimate": line_estimate, "reason": reason, "suggestedFix": suggested_fix,
    })
    response.raise_for_status()
    return response.json()["bugReportId"]
```

`AsyncHTTPTransport(retries=2)` only retries connection-level failures (refused/reset), not timeouts or
5xx — acceptable given there are only 2 call sites and Backend being briefly unavailable during a redeploy
is the only realistic transient failure worth cushioning; not worth pulling in a retry library for this.
Module-level client is fine to construct at import time, but must be closed on shutdown — wire into
`main.py`'s lifespan (A11).

### A10. `app/domains/triage/tools.py` — depends on A2–A9

The 7 tools, 1:1 behavior. Uses `langchain_core.tools.tool` decorator + `args_schema`; `submit_bug_report`
takes an extra `runtime: ToolRuntime` parameter (verified against installed `deepagents`/`langchain`
packages — `deepagents/middleware/subagents.py` itself uses this exact pattern internally, so it's not
a guess). **No `Annotated[...]` wrapper needed** — the type hint alone triggers injection, and it's
excluded from the LLM-visible schema automatically, same as JS's `ToolRuntime` second param.

```python
from langchain.tools import ToolRuntime

async def _resolve_repo(slug: str) -> RepositoryDTO:
    repo = await backend_client.resolve_repository_by_slug(slug)
    if repo is None:
        raise ValueError(f'Repository dengan slug "{slug}" belum terdaftar')
    return repo

@tool("ripgrep_search", args_schema=RipgrepSearchArgs, description="Mencari kata kunci secara harfiah di dalam satu atau beberapa repositori terdaftar di disk. Kosongkan repoSlugs untuk mencari di semua repositori.")
async def ripgrep_search_tool(query: str, repo_slugs: list[str] | None = None) -> str:
    repos = await backend_client.list_repositories(repo_slugs)
    if not repos:
        return "Tidak ada repositori terdaftar yang cocok."
    matches = await search_across_repos(query, [r.local_path for r in repos])
    if not matches:
        return f'Tidak ada hasil pencocokan untuk kata kunci "{query}"'
    path_to_slug = {r.local_path: r.slug for r in repos}
    return "\n".join(f"[{path_to_slug.get(m.repo_path, m.repo_path)}] {m.file_path}:{m.line_number}: {m.line_content}" for m in matches)

# read_repo_file_tool, git_log_blame_tool, trace_dependencies_tool, tsc_no_emit_tool,
# run_linter_and_tests_tool: straightforward 1:1 translations of the TS bodies shown in triage.tools.ts
# (already read in full this session) — resolve repo via _resolve_repo, guard file paths via
# validate_path_boundary before any file/git access, dispatch to the A3/A4/A5 functions, format the
# same Indonesian success/failure strings.

@tool("submit_bug_report", args_schema=SubmitBugReportArgs, description="Panggil ini SEKALI sebagai aksi terakhir, setelah verifikasi (tsc_no_emit & run_linter_and_tests) lolos, untuk menyimpan perbaikan sebagai bug report terverifikasi.")
async def submit_bug_report_tool(repo_slug: str, file_path: str, reason: str, suggested_fix: str,
                                  runtime: ToolRuntime, line_estimate: str | None = None) -> str:
    configurable = runtime.config.get("configurable") or {}
    raw_thread_id = configurable.get("thread_id")
    try:
        chat_session_id = int(raw_thread_id) if raw_thread_id is not None else 0
    except (TypeError, ValueError):
        chat_session_id = 0
    if not chat_session_id:
        raise ValueError("thread_id tidak ditemukan di runtime config - gak bisa nyimpen bug report")

    repo = await _resolve_repo(repo_slug)
    validate_path_boundary(file_path, repo.local_path)  # guard-only, result unused — same as TS

    await backend_client.submit_bug_report(chat_session_id=chat_session_id, repository_id=repo.id,
                                            file_path=file_path, line_estimate=line_estimate,
                                            reason=reason, suggested_fix=suggested_fix)
    return "Bug report berhasil disimpan."

triage_tools = [ripgrep_search_tool, read_repo_file_tool, git_log_blame_tool, trace_dependencies_tool,
                tsc_no_emit_tool, run_linter_and_tests_tool, submit_bug_report_tool]
```

### A11. `app/domains/triage/agent.py` — depends on A6, A10

```python
from deepagents import create_deep_agent
from app.infra.llm.get_chat_model import get_chat_model
from app.domains.triage.tools import triage_tools

SYSTEM_PROMPT = """You are the Smart Bug Triage Agent for a multi-repo codebase.
... (copy verbatim from backend/src/domains/triage/triage.agent.ts's SYSTEM_PROMPT, unchanged) ...
Never call submit_bug_report before tsc_no_emit and run_linter_and_tests have both passed."""

def create_triage_agent(checkpointer):
    return create_deep_agent(model=get_chat_model(), tools=triage_tools,
                              system_prompt=SYSTEM_PROMPT, checkpointer=checkpointer)
```

No `subagents=`/`backend=` — matches the current TS call site exactly (single-agent only, per the
confirmed scope decision).

### A12. `app/domains/triage/service.py` — depends on A11

This is the one piece that's genuinely **new logic, not a port** — the todos/message-diffing loop
currently in `triage.routes.ts` moves here, since Engine now owns event-shaping and Backend becomes a
dumb relay (see Part B). Also where the recursion/timeout ceilings from the runtime-robustness research
get applied:

```python
AGENT_RECURSION_LIMIT = 100      # LangGraph default (25) is too tight: one self-correction cycle
                                  # (investigate + draft + tsc_no_emit + run_linter_and_tests + revise,
                                  # possibly several docker passes) burns ~2 graph steps per tool call.
AGENT_TURN_TIMEOUT_SECONDS = 600  # wall-clock ceiling independent of step count

async def invoke_agent(agent, chat_session_id: int, content: str):
    config = {"configurable": {"thread_id": str(chat_session_id)}, "recursion_limit": AGENT_RECURSION_LIMIT}
    last_todos_json, last_ai_text = "", ""
    try:
        prior_state = await agent.aget_state(config)
        last_message_count = len((prior_state.values or {}).get("messages") or [])

        async with asyncio.timeout(AGENT_TURN_TIMEOUT_SECONDS):
            async for chunk in agent.astream({"messages": [{"role": "user", "content": content}]}, config):
                todos = chunk.get("todos")
                if todos:
                    todos_json = json.dumps(todos)
                    if todos_json != last_todos_json:
                        last_todos_json = todos_json
                        yield {"event": "todos_updated", "data": todos}

                messages = chunk.get("messages") or []
                if len(messages) > last_message_count:
                    for message in messages[last_message_count:]:
                        if not isinstance(message, AIMessage):
                            continue
                        last_ai_text = str(message.text)
                        yield {"event": "message_delta", "data": {"content": last_ai_text}}
                    last_message_count = len(messages)

        yield {"event": "completed", "data": {"chatSessionId": chat_session_id, "content": last_ai_text}}
    except GraphRecursionError:
        yield {"event": "error", "data": {"message": "Agent exceeded maximum reasoning steps"}}
    except TimeoutError:
        yield {"event": "error", "data": {"message": "Agent turn timed out"}}
    except Exception:
        logger.exception("Triage agent stream failed")
        yield {"event": "error", "data": {"message": "Agent failed to process the request"}}
```

Verified: `agent.astream(...)` defaults to `stream_mode="values"` in this LangGraph version (full
accumulated state per step) — same default the TS `.stream()` relied on, so `chunk.get("todos")`/
`chunk.get("messages")` is the correct 1:1 read. `AIMessage.text` is a property (Python analogue of JS's
`.text` getter). The `completed` event's `content` field is new versus the old TS payload
(`{chatSessionId}` only) — Backend needs it now to call `saveAssistantMessage` itself (see Part B).

### A13. `app/domains/triage/routes.py` — depends on A12

```python
router = APIRouter()

@router.post("/invoke")
async def invoke(payload: AgentInvokeRequest, request: Request) -> StreamingResponse:
    agent = request.app.state.agent
    async def ndjson_stream():
        async for event in invoke_agent(agent, payload.chat_session_id, payload.content):
            yield json.dumps(event, default=str).encode("utf-8") + b"\n"
    return StreamingResponse(ndjson_stream(), media_type="application/x-ndjson")
```

**Format decision: NDJSON, not SSE framing**, for this Engine→Backend leg specifically. SSE's
`event:`/`data:` framing exists to satisfy browsers' `EventSource` contract on the frontend leg; here
it's two backend processes over plain HTTP, so newline-delimited JSON is simpler on both ends. The
_frontend_-facing SSE format (produced by Backend) is unchanged.

### A14. `main.py` — rewrite, depends on everything above

Build the pool/checkpointer/agent/httpx-client **eagerly at startup** via `lifespan`, not lazily on
first request (TS's `agentPromise` lazy-singleton was a workaround for Hono having no clean startup
hook — FastAPI's `lifespan` _is_ that hook, so building eagerly is strictly better: fails fast if
Postgres is unreachable, at deploy time rather than a user's first message). Use `AsyncExitStack` so the
connection pool and httpx client share one teardown path:

```python
from contextlib import asynccontextmanager, AsyncExitStack

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncExitStack() as stack:
        checkpointer = await stack.enter_async_context(build_checkpointer(settings.DATABASE_URL))
        await checkpointer.setup()
        app.state.agent = create_triage_agent(checkpointer)
        yield

app = FastAPI(title="Smart Bug Triage Engine", lifespan=lifespan)
app.include_router(triage_router, prefix="/agent")
app.middleware("http")(request_id_middleware)  # from app/infra/logging.py

@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

Also add `app/infra/logging.py` (stdlib `logging`, no new dependency): a small JSON formatter plus a
`contextvars.ContextVar`-based request ID set in an HTTP middleware — Python's native answer to
threading a correlation ID through one request's whole async call tree (tool calls, subprocess output,
errors) without passing a logger instance everywhere, which is why TS needs Pino's explicit
`c.get("logger")` pattern and Python doesn't. `contextvars` survive `await` boundaries within the same
task, including through `StreamingResponse`'s generator (Starlette iterates it in the same task the
middleware wrapped, not a spawned one). One cheap win for later: Backend forwarding its own Hono
`requestId` as an `X-Request-Id` header when calling Engine, so one user action correlates across both
services' logs — not required for this pass, just cheap to add later.

Run with: `granian --interface asgi --reload --host 0.0.0.0 --port 8000 main:app` (already the chosen
ASGI server; not `uvicorn`).

**`pyproject.toml` additions**: `psycopg[binary,pool]>=3.3` (required, A7). Optionally
`[tool.ruff]` with `select = ["E","F","I","UP","B","ASYNC"]` — the `ASYNC` ruleset specifically catches
an accidental blocking call sneaking into an `async def`, directly reinforcing the A1 discipline. Skip
mypy/pytest scaffolding for now — add once a first real test file exists, not speculatively.

**Known, deliberately-accepted limitation** (write down, don't silently ignore): two concurrent
`/agent/invoke` calls for the _same_ `chat_session_id` (double-click send, a Backend retry racing the
first attempt) aren't safe — both would read the same "latest checkpoint" and could write divergent
forks, and if their tools mount the same repo checkout, two concurrent `docker run`s against the same
directory can interfere. Not fixing this now (traffic is low, this is early-stage); if it ever bites,
the fix is a Postgres advisory lock (`pg_advisory_lock(hashtext(thread_id))`) via the same pool — correct
across multiple Granian worker processes, unlike an in-memory lock.

---

## Part B — TypeScript changes needed in `backend/`

### B1. Two new internal (unauthenticated) endpoints

**Operational note, not a design decision to revisit**: per `flow-bisnis.md`, Engine never presents a
JWT — these two routes must not be reachable from outside the internal network (firewall/reverse-proxy
rule when deployed; not a concern for local dev).

`backend/src/domains/repository/repository.routes.ts` — add before the existing `.get("/:id", ...)`
(this file already puts static routes like `/browse-dirs`/`/sync/last` ahead of `/:id`; follow that
convention):

```ts
.get("/internal/by-slug/:slug", async (c) => {
    try {
        const repository = await repositoryService.resolveRepositoryBySlugInternal(c.req.param("slug"))
        return c.json({ repository })
    } catch (e) { return handleError(c, e, "Internal resolve repository by slug failed") }
})
.get("/internal", async (c) => {
    const slugsParam = c.req.query("slugs")
    const slugs = slugsParam ? slugsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined
    try {
        const repositories = await repositoryService.listRepositoriesInternal(slugs)
        return c.json({ repositories })
    } catch (e) { return handleError(c, e, "Internal list repositories failed") }
})
```

`repository.service.ts` additions (reuse existing `toRepositoryResponseDTO`, no DTO change needed —
Engine's Pydantic models just ignore extra fields, Pydantic v2 default):

```ts
resolveRepositoryBySlugInternal: async (slug: string): Promise<RepositoryResponseDTO> => {
    const repo = await repositoryRepo.getRepositoryBySlug(slug)
    if (!repo) throw new RepositoryNotFoundError(`Repository dengan slug "${slug}" belum terdaftar`)
    return toRepositoryResponseDTO(repo)
},
listRepositoriesInternal: async (slugs?: string[]): Promise<RepositoryResponseDTO[]> => {
    const repos = (slugs && slugs.length > 0)
        ? (await Promise.all(slugs.map((s) => repositoryRepo.getRepositoryBySlug(s)))).filter((r): r is RepositoryRow => r !== null)
        : await repositoryRepo.listRepositories()
    return repos.map(toRepositoryResponseDTO)
},
```

`packages/shared/src/schemas/triage.schema.ts` — add (then `pnpm --filter @restack/shared build`):

```ts
export const SubmitBugReportInternalSchema = z.object({
  chatSessionId: z.number().int().positive(),
  repositoryId: z.number().int().positive(),
  filePath: z.string().min(1),
  lineEstimate: z.string().nullable().optional(),
  reason: z.string().min(1),
  suggestedFix: z.string().min(1),
});
export type SubmitBugReportInternalRequestDTO = z.infer<
  typeof SubmitBugReportInternalSchema
>;
```

`triage.service.ts` addition:

```ts
submitBugReportInternal: async (data: SubmitBugReportInternalRequestDTO): Promise<{ bugReportId: number }> => {
    const report = await triageRepo.createdBugReport({
        chatSessionId: data.chatSessionId, repositoryId: data.repositoryId, filePath: data.filePath,
        lineEstimate: data.lineEstimate ?? null, reason: data.reason, suggestedFix: data.suggestedFix,
    })
    return { bugReportId: report.id }
},
```

`triage.routes.ts` addition:

```ts
.post("/internal/bug-reports", zValidator("json", SubmitBugReportInternalSchema), async (c) => {
    try {
        const result = await triageService.submitBugReportInternal(c.req.valid("json"))
        return c.json(result, 201)
    } catch (e) { return handleError(c, e, "Internal submit bug report failed") }
})
```

### B2. Rewire `triage.service.ts#sendMessage` to call Engine instead of running the agent

Add `ENGINE_URL: z.string().url().default("http://localhost:8000")` to `backend/src/config/env.ts` (and
`.env.example`). Remove `PostgresSaver`/`createTriageAgent` imports and the lazy-singleton
`getTriageAgent()` — Engine owns all of that now:

```ts
async sendMessage(chatSessionId: number, userId: number, data: CreateMessageRequestDTO) {
    await assertOwnership(chatSessionId, userId)
    await triageRepo.addMessage({ chatSessionId, role: "user", content: data.content, imageUrl: data.imageUrl ?? null })

    const res = await fetch(`${env.ENGINE_URL}/agent/invoke`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatSessionId, content: data.content }),
    })
    if (!res.ok || !res.body) throw new Error(`Engine invoke failed: HTTP ${res.status}`)
    return res.body  // ReadableStream<Uint8Array> of NDJSON lines — single-consume, same rule as before
},
```

### B3. Rewire `triage.routes.ts`'s SSE handler to relay Engine's NDJSON stream

Reads NDJSON lines from the `ReadableStream` returned by B2, forwards `todos_updated`/`message_delta`/
`error` verbatim (Backend needs zero LangGraph knowledge for these three), and specially handles
`completed` — pulls `content` out to call `saveAssistantMessage`, then forwards a stripped
`{chatSessionId}` payload so the _frontend_-facing SSE wire format is unchanged (`frontend/domains/triage`
consumer code is untouched by this whole migration):

```ts
return streamSSE(c, async (stream) => {
  try {
    const reader = engineStream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const { event, data } = JSON.parse(line) as {
          event: string;
          data: unknown;
        };
        if (event === "completed") {
          const payload = data as { chatSessionId: number; content?: string };
          await triageService.saveAssistantMessage(
            chatSessionId,
            payload.content ?? "",
          );
          await stream.writeSSE({
            event: "completed",
            data: JSON.stringify({ chatSessionId }),
          });
          continue;
        }
        await stream.writeSSE({ event, data: JSON.stringify(data) });
      }
    }
  } catch (error) {
    reqLogger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "Engine stream relay failed",
    );
    await stream.writeSSE({
      event: "error",
      data: JSON.stringify({ message: "Agent failed to process the request" }),
    });
  }
});
```

### B4. Cleanup — LAST step, only after B1–B3 verified working end-to-end

Delete: `backend/src/domains/triage/triage.agent.ts`, `triage.tools.ts`,
`backend/src/infra/code-search/ripgrep.ts` (+ its test), `git-history.ts`. In `sandbox.ts`, delete
`runTypeCheck`/`runLinterAndTests` and the parts of `runInSandbox`/`runLocalHostCommand` only they used —
**keep `installDependencies` and whatever `runInSandbox` machinery it needs**, that stays permanently.
Then: remove `@vscode/ripgrep` from `backend/package.json` (only consumer was `ripgrep.ts`); check
whether `@langchain/core`/`@langchain/openai`/`@langchain/langgraph-checkpoint-postgres`/`deepagents`/
`langchain` have any remaining consumer (`get-chat-model.ts` becomes dead too and should go) —
`simple-git` **stays** (permanent, used by `git.ts`); remove now-dead `LLM_API_KEY`/`LLM_BASE_URL`/
`LLM_MODEL` from `backend/src/config/env.ts`/`.env.example`. Run `pnpm --filter backend build` and the
existing Vitest suite after each deletion.

---

## Implementation order

1. Engine infra with zero Backend dependency (A1→A7) — each is independently testable against a scratch
   repo folder on disk, no network needed.
2. Backend internal endpoints (B1) — testable with curl, independent of Engine. Run
   `pnpm --filter @restack/shared build` after the schema change, then `pnpm --filter backend test`.
3. Engine domain layer (A8→A11), smoke-testing `backend_client.py`'s functions against the live Backend
   from step 2 before writing `tools.py`.
4. Engine wiring (A12→A14). Test `POST /agent/invoke` directly with curl against a real `chatSessionId`,
   verifying the NDJSON shape, **before** touching Backend's relay.
5. Backend relay rewrite (B2, B3). Test the full path end-to-end through the existing (unchanged)
   frontend, or curl against Backend's public SSE endpoint.
6. Cleanup deletion (B4) — only after step 5 works.

**Pace this in stages, not one giant sitting** — pause after step 1, step 2+4 (once Engine responds
correctly to curl), and step 5 (once the full chat flow works through the actual UI) for a quick check-in
before continuing, consistent with how the rest of this migration has been built so far this session.

## Verification

- Steps 1–2: unit-test each Python infra function directly (a scratch script or a couple of `pytest`
  cases) against a throwaway repo folder; curl the two new Backend endpoints directly.
- Step 4: `curl -N -X POST http://localhost:8000/agent/invoke -H "Content-Type: application/json" -d
'{"chatSessionId": <real id>, "content": "..."}'` — confirm NDJSON lines stream out with the right
  `todos_updated`/`message_delta`/`completed` shapes, and that `submit_bug_report` actually lands a row
  in Backend's `bug_reports` table via the new internal endpoint.
- Step 5: run both `backend` and `engine` locally, drive a real chat session through the frontend (or
  curl Backend's `POST /api/triage/chat-sessions/:id/messages`), confirm SSE events reach the client
  exactly as before, and that a follow-up message in the same session doesn't replay old history (the
  `baselineMessageCount`-equivalent logic in `service.py`).
- Step 6: `pnpm --filter backend test` (full suite) + `pnpm --filter backend build` clean after each
  deletion.

[x] Stage 1: Engine infra - config.py, proc.py, path_guard.py, ripgrep.py, git_history.py, sandbox.py, get_chat_model.py, checkpointer.py
[x] Fix pyproject.toml: add psycopg[binary,pool], remove gitpython
[x] Stage 2: Backend internal endpoints (repository + triage internal routes)
[x] Fix DB migrasi: db:generate (0002_tranquil_sandman.sql nambah source_type + enum),
fix missing FK constraints (bug_reports_chat_session_id_chat_sessions_id_fk,
messages_chat_session_id_chat_sessions_id_fk), db:push clean. Endpoint internal gak 500 lagi.
[x] Stage 3: Engine domain layer - schemas.py, backend_client.py, tools.py, agent.py
[x] Stage 4: Engine wiring - service.py, routes.py, main.py, logging.py
    (checkpointer setup OK, agent created OK, granian boot OK, health endpoint OK)
[x] Stage 5: Backend relay rewrite - env.ts (+ENGINE_URL), triage.service.ts (sendMessage
    now fetch Engine NDJSON, hapus checkpointer/agent import), triage.routes.ts (SSE handler
    jadi NDJSON relay, completed event pull content buat saveAssistantMessage). No TS errors.
[x] Stage 6: Cleanup - hapus triage.agent.ts, triage.tools.ts, ripgrep.ts (+test),
    git-history.ts, get-chat-model.ts, path-guard.ts. sandbox.ts: hapus runTypeCheck/
    runLinterAndTests/getPackageScripts/runLocalHostCommand, keep installDependencies.
    Hapus 7 dead deps dari package.json (@langchain/*, deepagents, langchain, @vscode/ripgrep).
    Hapus LLM_* dari backend env.ts/.env. pnpm install: -34 packages. Build + 34/34 test pass.
