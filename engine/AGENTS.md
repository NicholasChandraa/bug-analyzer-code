# Engine (Python/FastAPI) — Agent Instructions

See `.github/copilot-instructions.md` for the full project guide.

## Architecture

- **Orchestrator + Subagent pattern** via `create_deep_agent()` (`deepagents` package on LangGraph)
- `domains/orchestrator/agent.py` — `create_orchestrator_agent()` builds the top-level agent (no tools of its own besides `task` + `write_todos`)
- `domains/triage/agent.py` — `TRIAGE_SUBAGENT` dict with 7 tools, imported directly in `orchestrator/agent.py`
- `domains/mcp/agent.py` — `build_mcp_subagent()` dynamically loads MCP tools at startup
- Subagents are **stateless** — each `task()` call creates a fresh instance
- Tools needing runtime context use `runtime: ToolRuntime` parameter (injected by Deep Agents)

## Key Files

| File                                   | Purpose                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `main.py`                              | FastAPI app, lifespan (builds checkpointer + agent eagerly), request ID middleware |
| `app/config.py`                        | `pydantic-settings` — fail-fast on boot                                            |
| `app/infra/db/checkpointer.py`         | `AsyncPostgresSaver` over `AsyncConnectionPool`                                    |
| `app/infra/agent/streamer.py`          | `stream_agent_events()` — diffs state chunks, emits NDJSON events                  |
| `app/infra/proc.py`                    | `run_subprocess()` — single choke point for all subprocess execution               |
| `app/infra/backend_client.py`          | httpx client for Engine→Backend HTTP calls                                         |
| `app/infra/llm/get_chat_model.py`      | `ChatOpenAI` factory (any OpenAI-compatible provider)                              |
| `app/infra/security/path_guard.py`     | `validate_path_boundary()` — path traversal prevention                             |
| `app/domains/orchestrator/routes.py`   | `POST /agent/invoke` — NDJSON `StreamingResponse`                                  |
| `app/domains/orchestrator/service.py`  | `invoke_orchestrator()` — error handling, timeout, recursion limit                 |
| `app/domains/triage/tools/__init__.py` | Exports `triage_tools` list (7 tools)                                              |

## Commands

```bash
cd engine
.\start.ps1                               # granian dev server on :8000
# Manual: uv run granian --interface asgi --host 0.0.0.0 --port 8000 main:app
```

## Conventions

- **All subprocess execution** goes through `infra/proc.py`'s `run_subprocess()` — never use `subprocess.run` directly
- **Logging**: RichHandler with `request_id` contextvar — use `logging.getLogger(__name__)` and `set_request_id()`/`get_request_id()`
- **Wire schemas**: Use `CamelModel` (Pydantic with camelCase aliases) in `infra/schemas.py`
- **Tool args**: Define Pydantic schemas in `domains/triage/schemas.py`, use `@tool(args_schema=...)`
- **New subagent**: Create domain folder with `agent.py` (exporting a subagent dict), import in `orchestrator/agent.py`, append to `subagents` list
- **New tool**: Create file in `domains/triage/tools/`, add to `__init__.py`'s `triage_tools` list
- **Recursion limit**: `AGENT_RECURSION_LIMIT = 100` in `infra/agent/streamer.py`
- **Turn timeout**: `AGENT_TURN_TIMEOUT_SECONDS = 600` in `infra/agent/streamer.py`

## What NOT to do

- Do NOT use `subprocess.run` in a thread pool — always use `asyncio.create_subprocess_exec` via `run_subprocess()`
- Do NOT access Drizzle tables directly — use `backend_client.py` to call Backend's internal HTTP endpoints
- Do NOT add `requireAuth`-style auth to Engine endpoints — network-level isolation only
- Do NOT create agent/tool logic in `backend/` — it belongs here in `engine/`
