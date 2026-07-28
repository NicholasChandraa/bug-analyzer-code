# Smart Bug Triage Agent — Copilot Instructions

## Project Overview

"Smart Bug Triage Agent" — a 3-service monorepo (pnpm workspaces + Python sibling). Users describe a bug (text + screenshot) in a chat UI; a LangGraph/DeepAgents agent classifies it, searches across registered git repos on disk, and drafts a verified fix, streamed back over SSE and saved to an internal dashboard.

**This is a 3-service system, not a 2-tier app:**
- `frontend/` — Next.js 16 (App Router), talks ONLY to `backend/` (never directly to `engine/`).
- `backend/` — Hono (TypeScript). Owns `auth`, `user`, `repository`, and a slim `triage` domain (chat CRUD + SSE relay). Forwards agent requests to `engine/` and relays the stream back.
- `engine/` — Python/FastAPI. Owns the LangGraph/DeepAgents reasoning loop and ALL agent tools natively in Python (ripgrep, git, Docker sandbox). Its only direct DB dependency is its own LangGraph Postgres checkpointer tables; everything else (resolving repo slugs, submitting bug reports) goes through HTTP calls to `backend/`.

Dependency direction is one-way except for two narrow HTTP touchpoints: `backend` → `engine` to invoke the agent, and `engine` → `backend` to resolve repo info / submit a bug report.

## Commands

Run from repo root unless noted. Package-specific commands go through `pnpm --filter <name>`.

```bash
pnpm install                              # install all workspace deps
pnpm --filter @restack/shared build       # compile shared Zod schemas — MUST run first
pnpm --filter @restack/shared dev         # tsc --watch, keep running while editing schemas

pnpm --filter backend dev                 # Hono dev server (tsx watch), http://localhost:3001
pnpm --filter backend test                # Vitest — run backend test suite
pnpm --filter backend test -- path/to/file.test.ts   # run a single test file
pnpm --filter backend test -- -t "test name"         # run tests matching a name
pnpm --filter backend db:push             # push Drizzle schema to Postgres (runs a connectivity check first)
pnpm --filter backend db:generate         # generate SQL migration files into backend/drizzle/
pnpm --filter backend db:studio           # Drizzle Studio GUI

pnpm --filter frontend dev                # Next.js dev server (Turbopack), http://localhost:3000
pnpm --filter frontend lint               # ESLint
```

**Engine (Python):** Run from `engine/` directory:
```bash
cd engine
.\start.ps1                               # Windows — granian dev server on port 8000
# Or manually: uv run granian --interface asgi --host 0.0.0.0 --port 8000 main:app
```

There is no root-level test/lint aggregator — run backend and frontend commands separately. Backend has no lint script; frontend has no test script.

## Architecture: Semi-DDD (Feature-Driven, Not Layer-Driven)

Code is organized by business domain, not by technical layer.

### Backend (`backend/src/domains/<feature>/`)

Each domain has up to four files with a strict responsibility split:
- `*.model.ts` — Drizzle `pgTable` definitions only.
- `*.repo.ts` — Drizzle queries only, no business logic. Exported as a plain object of async functions (`export const xRepo = { ... }`), not a class.
- `*.service.ts` — Business logic only; never touches Drizzle directly, always goes through `*.repo.ts`.
- `*.routes.ts` — Hono routes: validates input with `zValidator` against schemas from `@restack/shared`, calls the service, shapes the JSON response.

**Cross-domain dependency rule (one-directional, enforced by convention):**
- `auth` may import from `user` (e.g. `usersTable`). The reverse is forbidden.
- `triage` may import from `repository` (e.g. `repositoriesTable`). The reverse is forbidden.

Current domains: `auth`, `user`, `repository`, `triage` — all mounted in `hono-app.ts`.

### Frontend (`frontend/domains/<feature>/`)

- `components/` — UI components (no direct data fetching)
- `hooks/` — Reactive state & data fetching logic
- `services/` — Thin HTTP wrappers around `apiClient`
- `types.ts` — Local TS type declarations

`frontend/app/` is strictly for routing, layout, and metadata — never put forms, state, or complex JSX directly in `app/`; delegate to domain components.

### Engine (`engine/app/`)

- `domains/orchestrator/` — Orchestrator agent (routes, service, agent factory, subagents registry)
- `domains/triage/` — Triage subagent (agent factory, tools, schemas, repo resolver)
- `infra/` — Cross-cutting infrastructure: LLM gateway, code search (ripgrep, git), verification sandbox, DB checkpointer, MCP client, security (path guard, sensitive data masking), logging, subprocess runner

## Key Conventions

### Shared Schema Package & DTO Naming

`@restack/shared`'s `package.json` resolves to `dist/` (gitignored). After editing anything under `packages/shared/src/schemas/`, you MUST run `pnpm --filter @restack/shared build` (or keep its `dev` watcher running) or the frontend/backend will silently use stale types.

All shared DTO contracts follow explicit naming:
- Request Payloads: `<Action><Entity>RequestDTO` (e.g. `LoginRequestDTO`, `CreateRepositoryRequestDTO`)
- Response Payloads: `<Entity>ResponseDTO` (e.g. `AuthResponseDTO`, `RepositoryResponseDTO`)

### Backend Entry Points

`backend/src/hono-app.ts` builds and exports the actual `Hono` `app` (middleware, CORS/CSRF, route mounting) and is the single source of truth for behavior. Two thin entry points consume it:
- `backend/src/index.ts` — persistent server via `@hono/node-server` (local dev / VPS)
- `backend/api/index.ts` — Vercel serverless function; just re-exports `app`

Never add server-startup logic to either entry point — it belongs in `hono-app.ts`.

### Auth & Cookies

Dual-token cookie auth: short-lived JWT `access_token` (15 min, HS256 via `jose`) + opaque `refresh_token` (30 days, only its SHA-256 hash is persisted in `auth_sessions`). Refresh rotates on every use via an atomic `DELETE ... RETURNING` (`authRepo.consumeSessionByHash`). `SameSite=None`+`Secure` in production, `SameSite=Lax` (no `Secure`) in development.

No server-side auth gate (`middleware.ts`/`proxy.ts`) — frontend and backend can deploy to unrelated domains. Auth is enforced via backend `requireAuth`/`requireRole(role)` middleware and frontend `<RequireAuth>` or hook-level checks. Roles are `"user" | "admin"`.

The frontend's `lib/api-client.ts` wraps `hono/client`'s `hc<AppType>` (importing `AppType` from `backend/src/hono-app.ts` — a monorepo type-only import) with a `customFetch` that transparently retries once after a 401 by calling `/api/auth/refresh`, deduping concurrent refresh attempts through a single shared `refreshPromise`.

### Logging

Every `/api/*` request gets a `requestId` (Hono's `requestId()` middleware) and a Pino child logger bound to Hono context as `c.get("logger")`. `requireAuth` re-binds it with `userId`. In route handlers, always log through `c.get("logger") || logger` (the module-level `logger` singleton in `backend/src/utils/logger.ts`).

Engine uses RichHandler-based logging with `request_id` injected via `contextvars`.

### Environment Config

`backend/src/config/env.ts` parses `process.env` through a Zod schema once at import time — an invalid or missing var crashes immediately on boot. When adding a new env var, add it to this schema.

Engine uses `pydantic-settings` (`engine/app/config.py`) with the same fail-fast pattern.

### TypeScript Strictness

Backend and shared packages compile with `noUncheckedIndexedAccess`. Drizzle's array-returning queries (`.select()...`, `.returning()`) are destructured as `const [row] = await ...` and are typed possibly `undefined` — the established pattern is `return row ?? null` for "not found is valid" cases, or `if (!row) throw new Error(...)` for "must exist" cases.

### Testing Conventions (Backend)

Vitest, colocated `*.test.ts` files (excluded from `tsc` build via `backend/tsconfig.json`). Service tests mock the repo layer with `vi.mock("./x.repo.js", () => ({ xRepo: { ... } }))` and assert on business logic in isolation. Middleware tests build a minimal real `Hono` app and drive it through `app.request(...)`.

### Engine ↔ Backend Communication

Engine communicates with Backend via exactly two HTTP internal endpoints (no JWT auth — network-level isolation only):
- `GET /api/repositories/internal/by-slug/:slug` — resolve repo slug to metadata
- `GET /api/repositories/internal?slugs=...` — list repositories
- `POST /api/triage/internal/bug-reports` — submit a verified bug report

These endpoints are intentionally NOT behind `requireAuth`/`requireRole` — they must be protected by firewall/reverse-proxy allowlisting in production.

### Engine Subprocess Runner

All subprocess execution in the Engine goes through `engine/app/infra/proc.py` (`run_subprocess`), which uses `asyncio.create_subprocess_exec` (not `subprocess.run` in a thread pool) so that cancelled requests can properly kill the OS process. This is the single choke point for all external command execution.

### Engine Tool Architecture

Each tool in `engine/app/domains/triage/tools/` lives in its own file. Shared helpers (repo resolution, path guard, formatting) are in `_common.py`. Tools use `RepoResolver` (dependency-injectable) to resolve repo slugs via Backend HTTP calls. The `triage_tools` list is exported from `__init__.py` for the agent factory to consume.

### Engine Agent Architecture (Deep Agents)

The Engine uses `create_deep_agent()` from the `deepagents` package (built on LangGraph). Key patterns:

**Orchestrator + Subagent pattern:**
- `orchestrator/agent.py` — Main agent that classifies intent and delegates to subagents via the built-in `task` tool. Has no tools of its own (except `write_todos` from TodoListMiddleware).
- `triage/agent.py` — Triage subagent with all 7 investigation/verification tools. Configured in `orchestrator/subagents.py`.
- New subagents can be added by appending a dict to the `subagents` list in `subagents.py` — no changes needed to `agent.py` or `service.py`.

**Subagent config format (from `subagents.py`):**
```python
{
    "name": "triage",                    # identifier for task(agent="name")
    "description": "...",                # when orchestrator should delegate
    "system_prompt": TRIAGE_SYSTEM_PROMPT,  # isolated instructions
    "tools": triage_tools,               # specialized tools
}
```

**Subagents are stateless** — each `task()` call creates a fresh subagent instance. The orchestrator must provide COMPLETE instructions in a single call. Subagents don't remember previous calls and don't inherit skills from the main agent.

**Checkpointer (Postgres):** The engine builds `AsyncPostgresSaver` with a connection pool (`AsyncConnectionPool`) in `infra/db/checkpointer.py`. This is required for conversation persistence across turns. The `thread_id` is set to `str(chat_session_id)` in the config.

**Streaming:** The engine uses `agent.astream(stream_mode="values")` and processes chunks via `AgentStreamer` (`infra/agent/streamer.py`), which diffs state between chunks to emit `todos_updated`, `message_delta`, and `completed` events. The `seed_from_state()` method prevents replay of prior messages by checking `agent.aget_state()` before streaming.

**ToolRuntime injection:** Tools that need access to runtime context (e.g., `submit_bug_report` reading `thread_id`) use `runtime: ToolRuntime` as a parameter — Deep Agents injects this automatically. The `thread_id` is accessed via `runtime.config.get("configurable", {}).get("thread_id")`.

**Recursion & timeout limits** (in `infra/agent/streamer.py`):
- `AGENT_RECURSION_LIMIT = 100` — LangGraph default (25) is too tight for self-correction loops (investigate → draft → verify → revise cycles).
- `AGENT_TURN_TIMEOUT_SECONDS = 600` — Docker verification can take 1-3+ minutes.

### MCP Server Support

Engine supports MCP servers via `MCP_SERVERS` env var (JSON string). All MCP tools from all servers are loaded at startup via `langchain-mcp-adapters`'s `MultiServerMCPClient` and combined into a **single `mcp` subagent** — not one subagent per server. The LLM in the mcp subagent sees all tool descriptions and picks the right one automatically. The subagent is always created even if `MCP_SERVERS` is empty (with `tools=[]`). Configured in `engine/app/infra/mcp/client.py`. Supported transports: `http`, `sse`, `stdio`.

### Transitional Code (TS → Python Migration)

The TypeScript `triage.agent.ts`/`triage.tools.ts` (and `infra/code-search/ripgrep.ts`, `git-history.ts`, plus the verification half of `infra/verification/sandbox.ts`) are being **ported to `engine/`** and will eventually be deleted from `backend/`. Do NOT extend them for new agent capabilities — add those to the Python engine instead. `infra/code-search/git.ts` and `installDependencies()` in `sandbox.ts` stay in `backend/` permanently (they belong to the admin-triggered repository-sync flow).

### Frontend-Specific Warning

Next.js 16 in this repo has breaking changes vs. training-data knowledge of Next.js — before writing frontend code, consult the docs in `node_modules/next/dist/docs/` and heed deprecation notices.
