# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Smart Bug Triage Agent" — a monorepo (the "Restack Pattern" scaffold). The finished product lets a user
describe a bug (text + screenshot) in a chat UI; a LangGraph/DeepAgents agent classifies it, greps across
one or more registered git repos on the server disk, and drafts a suggested fix, streamed back over SSE
and saved to an internal dashboard. See `flow-bisnis.md` for the full business flow/architecture rationale,
`update.md` for the TS→Python Engine migration design, and `plan.md` for the implementation checklist (all
in Indonesian). `DEVELOPMENT.md` is the authoritative architecture/convention doc — read it before making
structural changes. **Both `plan.md`'s checkboxes and `DEVELOPMENT.md` lag actual code** (e.g. both still
describe the Engine as "being built" and the repo-sync flow as Docker/git-based) — when in doubt, check
the filesystem over either doc.

**This is a 3-service system, not a 2-tier frontend/backend app:**
- `frontend/` — Next.js 16, talks ONLY to `backend/` (never directly to `engine/`).
- `backend/` — Hono. Owns `auth`, `user`, `repository`, and a slim `triage` domain: `chat_sessions`/
  `messages`/`bug_reports` CRUD + the SSE endpoint the frontend talks to. It does not run the agent — it
  forwards the request to `engine/` and relays whatever NDJSON `engine/` streams back.
- `engine/` (Python/FastAPI) — owns the LangGraph/DeepAgents reasoning loop and all agent tools natively in
  Python (ripgrep search, file read, git log/blame, dependency tracing, `tsc`/lint/test verification — all
  via native `subprocess`). Its only direct database dependency is its own LangGraph Postgres checkpointer
  table(s); everything else (resolving a repo slug to a local path, submitting a finished bug report) goes
  through small HTTP calls to `backend/`, so `engine/` never touches the Drizzle schema.
- Dependency direction is one-way except for two narrow HTTP touchpoints: `backend` → `engine` to invoke the
  agent for a message, and `engine` → `backend` to resolve repo info / submit a bug report. Never the
  opposite for anything else.

**Repos are registered by local filesystem path, not cloned.** Registering/syncing a repository does
**not** do a `git clone`/`fetch`/`pull` and does **not** run anything in Docker — `repository.service.ts`
just validates the given `localPath` exists on disk (`fs.existsSync`) and logs a sync event. There is no
`simple-git`/`dockerode` dependency anywhere in this repo. Same on the verification side: the Engine's
`tsc`/lint/test tools run directly on the host via `asyncio.create_subprocess_exec` against the repo's
local path — no Docker sandbox. Don't reintroduce clone/Docker flows without checking with the user first;
this was a deliberate simplification, not an oversight.

The TypeScript `triage.agent.ts`/`triage.tools.ts` and the old `infra/code-search/ripgrep.ts`/
`git-history.ts`/`infra/verification/sandbox.ts`/`infra/llm/get-chat-model.ts` **have already been deleted**
from `backend/` — the agent/tool logic now lives only in `engine/`. Don't recreate them in `backend/`; any
new agent capability goes in the Python engine. `infra/code-search/git.ts` (the old clone/pull helper) is
also gone, superseded by the local-path model above — `backend/src/infra/` now contains only `db/` and
`middlewares/`.

Stack: Next.js 16 (App Router) frontend, Hono backend, Drizzle ORM + PostgreSQL, Zod schemas shared via
`@restack/shared`, pnpm workspaces (`frontend`, `backend`, `packages/*`), Node >= 20 — plus a Python/FastAPI
`engine/` (`uv`-managed, Python >= 3.13) running LangGraph + `deepagents`.

## Commands

Run from the repo root unless noted. Package-specific commands go through `pnpm --filter <name>`.

```bash
pnpm install                              # install all workspace deps
pnpm --filter @restack/shared build       # compile shared Zod schemas — MUST run first, see gotcha below
pnpm --filter @restack/shared dev         # or: tsc --watch, keep running while editing schemas

pnpm --filter backend dev                 # Hono dev server, tsx watch, http://localhost:3001
pnpm --filter backend test                # Vitest — run backend test suite
pnpm --filter backend test -- path/to/file.test.ts   # run a single test file
pnpm --filter backend test -- -t "test name"         # run tests matching a name
pnpm --filter backend db:push             # push Drizzle schema to Postgres (runs a connectivity check first)
pnpm --filter backend db:generate         # generate SQL migration files into backend/drizzle/
pnpm --filter backend db:studio           # Drizzle Studio GUI

pnpm --filter frontend dev                # Next.js dev server (Turbopack), http://localhost:3000
pnpm --filter frontend lint               # ESLint
```

Engine (run from `engine/`, not the repo root — it's a separate `uv` project, not a pnpm workspace member):
```bash
cd engine
.\start.ps1                               # Windows: granian dev server w/ reload, http://localhost:8000
# equivalent to: uv run granian --interface asgi --host 0.0.0.0 --port 8000 --reload main:app
```
Engine has no test suite yet — don't assume a `pytest` command exists.

There is no root-level test/lint aggregator across all three services — run backend, frontend, and engine
commands separately. Backend has no lint script; frontend has no test script. Root `package.json` only has
`dev`/`build` (`pnpm --parallel`, spans frontend+backend, not engine).

## Architecture: Semi-DDD (feature-driven, not layer-driven)

Code is organized by business domain, not by technical layer. Each backend domain
(`backend/src/domains/<feature>/`) has up to four files with a strict responsibility split:

- `*.model.ts` — Drizzle `pgTable` definitions only.
- `*.repo.ts` — Drizzle queries only, no business logic. Exported as a plain object of async functions
  (`export const xRepo = { ... }`), not a class.
- `*.service.ts` — business logic only; never touches Drizzle directly, always goes through `*.repo.ts`.
- `*.routes.ts` — Hono routes: validates input with `zValidator` against schemas imported from
  `@restack/shared`, calls the service, shapes the JSON response. No business logic here either.

Frontend domains (`frontend/domains/<feature>/`) mirror this: `components/` (UI, no direct fetching),
`hooks/` (data fetching / mutations / local state), `services/` (thin wrappers around `apiClient`),
`types.ts`. `frontend/app/` is routing/layout/metadata only — never put forms, state, or real JSX
structure directly in `app/`; delegate to domain components.

**Cross-domain dependency rule (one-directional, enforced by convention not tooling):**
- `auth` may import from `user` (e.g. `usersTable`). The reverse is forbidden.
- `triage` may import from `repository` (e.g. `repositoriesTable`). The reverse is forbidden.

Current domains: `auth`, `user`, `repository`, `triage` all have model/repo/service/routes and are mounted
in `hono-app.ts`. `triage`'s agent logic is entirely gone from `backend/` now — `triage.service.ts` only
persists chat history and proxies to `engine/` (see "Backend ↔ Engine HTTP contract" below).

### Engine (`engine/app/`) — Orchestrator + subagent Deep Agent

Built with `create_deep_agent()` (`deepagents` package, on top of LangGraph), not a single flat agent:

- `domains/orchestrator/` — `agent.py` builds the top-level agent via `create_orchestrator_agent()`. It has
  **no tools of its own** besides the built-in `task` tool (+ `write_todos`) — it only classifies intent and
  delegates. `subagents.py` is the registry: a plain list of `{name, description, system_prompt, tools}`
  dicts. Add a new subagent by appending to that list (or, for dynamically-loaded tools like MCP, adding a
  `build_x_subagent(tools)` factory) — no changes needed to `agent.py` or `service.py`. `routes.py` exposes
  `POST /agent/invoke`, returning an NDJSON `StreamingResponse`.
- `domains/triage/` — the triage subagent: `agent.py` (system prompt), `repo_resolver.py` (resolves repo
  slugs via `backend_client.py`, not Drizzle), `schemas.py`, and `tools/` — one file per tool
  (`ripgrep_search.py`, `read_repo_file.py`, `git_log_blame.py`, `trace_dependencies.py`,
  `run_linter_and_tests.py`, `tsc_no_emit.py`, `submit_bug_report.py`), sharing helpers via `_common.py`.
  `tools/__init__.py` exports the flat `triage_tools` list the subagent registry consumes.
- An `mcp` subagent is always present (even with zero tools configured) — see "MCP servers" below.
- **Subagents are stateless.** Each `task(agent="...")` call from the orchestrator spawns a fresh instance
  with no memory of prior calls — the orchestrator must pass complete instructions every time.
- Tools needing runtime context (e.g. `submit_bug_report` reading the chat session id) take a
  `runtime: ToolRuntime` param, injected automatically by Deep Agents; read via
  `runtime.config.get("configurable", {}).get("thread_id")`.
- Checkpointer: `infra/db/checkpointer.py` builds an `AsyncPostgresSaver` over an `AsyncConnectionPool`,
  built eagerly at FastAPI startup (`main.py`'s `lifespan`, not lazily on first request) so a broken
  `DATABASE_URL` fails at boot, not on first user message. `thread_id` = `str(chat_session_id)`.
- Streaming: `agent.astream(stream_mode="values")`, diffed chunk-to-chunk by `infra/agent/streamer.py`
  (`AgentStreamer`) into `todos_updated`/`message_delta`/`completed` events; `seed_from_state()` checks
  `agent.aget_state()` first to avoid replaying prior turns.
- `AGENT_RECURSION_LIMIT = 100` (LangGraph's default 25 is too tight for investigate→draft→verify→revise
  loops) and `AGENT_TURN_TIMEOUT_SECONDS = 600` (verification can take minutes) — both in `streamer.py`.
- All subprocess execution goes through `infra/proc.py`'s `run_subprocess()` — the single choke point,
  using `asyncio.create_subprocess_exec` (not a thread pool wrapping `subprocess.run`) specifically so a
  cancelled request can kill the underlying OS process instead of leaving it orphaned.
- `infra/llm/get_chat_model.py` mirrors the (now-deleted) TS `get-chat-model.ts`: any OpenAI-compatible
  provider via `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`.

**MCP servers:** configured via the `MCP_SERVERS` env var (JSON string keyed by server name, each with
`transport: http|sse|stdio` + connection details). `infra/mcp/client.py` loads all tools from all
configured servers at startup via `langchain-mcp-adapters`'s `MultiServerMCPClient` and merges them into
**one** `mcp` subagent (not one subagent per server) — the LLM inside picks the right tool from the
descriptions. Empty `MCP_SERVERS` still creates the subagent, just with an empty tool list.

### Backend entry points

`backend/src/hono-app.ts` builds and exports the actual `Hono` `app` (middleware, CORS/CSRF, route
mounting) and is the single source of truth for behavior. Two thin entry points consume it:
- `backend/src/index.ts` — persistent server via `@hono/node-server` (local dev / Railway / any VPS).
- `backend/api/index.ts` — Vercel serverless function; just re-exports `app` directly (no adapter needed
  since Hono already implements the Fetch API shape Vercel expects).
Never add server-startup logic to either entry point — it belongs in `hono-app.ts` so both stay in sync.

### Shared schema package & DTO conventions

`@restack/shared`'s `package.json` resolves to `dist/`, which is gitignored. After editing anything under
`packages/shared/src/schemas/`, you must run `pnpm --filter @restack/shared build` (or keep its `dev`
watcher running) or the frontend/backend will silently use stale types or fail to compile.

All shared DTO contracts strictly follow explicit naming:
- Request Payloads: `<Action><Entity>RequestDTO` (e.g. `LoginRequestDTO`, `RegisterRequestDTO`, `CreateRepositoryRequestDTO`).
- Response Payloads: `<Entity>ResponseDTO` (e.g. `AuthResponseDTO`, `UserResponseDTO`, `RepositoryResponseDTO`).

### Repository domain: local-path registration, not git sync

`repository.service.ts` treats every registered repo as a folder that already exists on the host disk at
`localPath` — `registerRepository`/`updateRepository` just `path.resolve()` + `fs.existsSync()` it.
`syncRepository` ("Local mode: verify folder exists (gak ada git clone/install lagi)") re-checks the folder
and writes a `CodebaseSyncResponseDTO` log row — it does not fetch/pull anything. `browseDirectories`
(`GET /repository/browse-dirs`) lists subdirectories of a given path via `fs.promises.readdir` so the admin
UI can pick a `localPath` interactively. All of this is admin-only (`requireRole("admin")`).

### Backend ↔ Engine HTTP contract

Exactly the two touchpoints named above, and no others — no JWT on either side, isolation is
network-level only (don't add `requireAuth`/`requireRole` to these, but also never expose them past a
firewall/reverse-proxy allowlist in production):
- Backend → Engine: `POST /agent/invoke` (`triage.service.ts`'s `sendMessage`) — body
  `{chatSessionId, content}`, response is an NDJSON stream Backend relays as SSE
  (`triage.routes.ts`), rewriting the `completed` event's payload down to `{chatSessionId}` after
  persisting the assistant message itself.
- Engine → Backend (`engine/app/infra/backend_client.py`):
  `GET /api/repositories/internal/by-slug/:slug`, `GET /api/repositories/internal?slugs=...`, and
  `POST /api/triage/internal/bug-reports`.

### Auth & cookies

Dual-token cookie auth: short-lived JWT `access_token` (15 min, HS256 via `jose`) + opaque, high-entropy
`refresh_token` (30 days, only its SHA-256 hash is persisted in `auth_sessions`). Refresh rotates on every
use via an atomic `DELETE ... RETURNING` (`authRepo.consumeSessionByHash`) so replays and concurrent-refresh
races both fail closed. `SameSite=None`+`Secure` in production, `SameSite=Lax` (no `Secure`) in development,
overridable via `COOKIE_SAME_SITE`/`COOKIE_DOMAIN` env vars.

There is intentionally no server-side auth gate (`middleware.ts`/`proxy.ts`) — frontend and backend can
deploy to unrelated domains, so cookies aren't readable server-side on the frontend. Auth is enforced two
places instead: backend `requireAuth`/`requireRole(role)` middleware (`backend/src/infra/middlewares/`),
and frontend `<RequireAuth>` (client-side check against `GET /api/user/me`) or hook-level checks. Roles are
`"user" | "admin"` (`usersTable.role`, propagated into the JWT payload).

The frontend's `lib/api-client.ts` wraps `hono/client`'s `hc<AppType>` (typed by importing `AppType`
directly from `backend/src/hono-app.ts` — a monorepo type-only import, not a network call) with a
`customFetch` that transparently retries once after a 401 by calling `/api/auth/refresh`, deduping
concurrent refresh attempts through a single shared `refreshPromise`.

### Logging

Every `/api/*` request gets a `requestId` (Hono's `requestId()` middleware) and a Pino child logger bound
to Hono context as `c.get("logger")`. `requireAuth` re-binds it with `userId` once the user is known. In
route handlers, always log through `c.get("logger") || logger` (the module-level `logger` singleton in
`backend/src/utils/logger.ts`) rather than the bare singleton, so logs carry correlation IDs. The Engine
mirrors this with `RichHandler`-based logging and a `request_id` `contextvar` (`infra/logging.py`), fed by
an `X-Request-Id` header Backend forwards on `/agent/invoke` (Engine generates one itself if absent).

### Environment config

`backend/src/config/env.ts` parses `process.env` through a Zod schema once at import time
(`envSchema.parse(...)`, exported as `env`) — an invalid or missing var crashes the process immediately on
boot rather than failing later at first use. When adding a new env var, add it to this schema (with
`.default(...)`/`.optional()` as appropriate, `z.coerce.number()` for numeric vars) rather than reading
`process.env` directly elsewhere. The Engine mirrors this with `pydantic-settings` (`engine/app/config.py`,
`Settings`) — same fail-fast-on-boot intent, reading from `engine/.env`.

### TypeScript strictness note

Backend and shared packages compile with `noUncheckedIndexedAccess`. Drizzle's array-returning queries
(`.select()...`, `.returning()`) are destructured as `const [row] = await ...` and are typed possibly
`undefined` — the established pattern is `return row ?? null` for "not found is valid" cases, or
`if (!row) throw new Error(...)` for "must exist" cases (see any `*.repo.ts`).

### Testing conventions (backend)

Vitest, colocated `*.test.ts` files (excluded from `tsc` build via `backend/tsconfig.json`). Service tests
mock the repo layer with `vi.mock("./x.repo.js", () => ({ xRepo: { ... } }))` and assert on business logic
in isolation (see `auth.service.test.ts`). Middleware tests build a minimal real `Hono` app and drive it
through `app.request(...)` rather than mocking Hono internals (see `require-auth.test.ts`).

## Frontend-specific warning

Next.js 16 in this repo has breaking changes vs. training-data knowledge of Next.js — before writing
frontend code, consult the docs in `node_modules/next/dist/docs/` and heed deprecation notices. (Full
detail lives in `frontend/AGENTS.md`, auto-loaded when working under `frontend/`.)
