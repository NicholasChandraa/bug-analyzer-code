# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Smart Bug Triage Agent" — a monorepo (the "Restack Pattern" scaffold) currently mid-build. The finished
product lets a user describe a bug (text + screenshot) in a chat UI; a LangGraph agent classifies it,
greps across one or more registered git repos on the server disk, and drafts a suggested fix, streamed
back over SSE and saved to an internal dashboard. See `flow-bisnis.md` for the full business flow/architecture
rationale and `plan.md` for the current implementation checklist (both in Indonesian). `DEVELOPMENT.md` is
the authoritative architecture/convention doc — read it before making structural changes.

Stack: Next.js 16 (App Router) frontend, Hono backend, Drizzle ORM + PostgreSQL, Zod schemas shared via
`@restack/shared`, pnpm workspaces (`frontend`, `backend`, `packages/*`). Node >= 20.

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
pnpm --filter frontend lint                # ESLint
```

There is no root-level test/lint aggregator — run backend and frontend commands separately. Backend has
no lint script; frontend has no test script.

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

Current domains: `auth`, `user` (complete), `repository`, `triage` (models + repos done; services/routes/
LangGraph graph still on the `plan.md` checklist and not yet wired into `hono-app.ts`).

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
`backend/src/utils/logger.ts`) rather than the bare singleton, so logs carry correlation IDs.

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
