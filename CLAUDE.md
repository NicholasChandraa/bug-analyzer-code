# CLAUDE.md

See `.github/copilot-instructions.md` for the full project guide (architecture, commands, conventions).

## TL;DR

**3-service system:** `frontend/` (Next.js 16) → `backend/` (Hono) → `engine/` (Python/FastAPI).  
**Repos are local-path only** — no git clone, no Docker.  
**Engine** uses `create_deep_agent()` (Orchestrator + Subagent pattern) with 7 triage tools + optional MCP.  
**TS agent code deleted** from `backend/` — all agent logic lives in `engine/` now.

## Quick Commands

```bash
pnpm install                                    # install all workspace deps
pnpm --filter @restack/shared build              # MUST run first after editing schemas
pnpm --filter backend dev                       # Hono on :3001
pnpm --filter backend test                      # Vitest
pnpm --filter backend db:push                   # push Drizzle schema
pnpm --filter frontend dev                      # Next.js on :3000
cd engine && .\start.ps1                        # FastAPI on :8000
```

## Key Gotchas

- **`@restack/shared` dist/ is gitignored** — run `pnpm --filter @restack/shared build` after editing schemas or keep its `dev` watcher running.
- **`noUncheckedIndexedAccess`** — Drizzle array queries: `const [row] = await ...` → `return row ?? null`.
- **Next.js 16 has breaking changes** — read `node_modules/next/dist/docs/` before writing frontend code.
- **`plan.md`/`DEVELOPMENT.md` lag actual code** — check the filesystem when in doubt.
- **Engine has no test suite** — don't assume `pytest` exists.
- **No root-level test/lint aggregator** — run backend/frontend/engine commands separately.
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
