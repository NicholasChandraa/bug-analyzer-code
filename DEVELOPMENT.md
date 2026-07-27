# DEVELOPMENT.md

This document outlines the architecture, build guidelines, and code conventions for the Restack Pattern monorepo. All developers and automated tools contributing to this project must follow these rules.

## Project Stack
- **Frontend**: Next.js 16 (App Router)
- **Backend**: Hono
- **Engine** (being built, see `update.md`): Python + FastAPI — hosts the LangGraph/DeepAgents agent and its tools
- **ORM**: Drizzle ORM (backend only — engine talks to Postgres only for its own LangGraph checkpointer tables)
- **Database**: PostgreSQL (Postgres-js driver on backend)
- **Validation**: Zod (shared schemas, backend/frontend only — engine uses Pydantic for its own request/response models)
- **Package Manager**: pnpm workspaces (backend/frontend); engine has its own Python dependency file (`requirements.txt` or equivalent), not part of the pnpm workspace

## Monorepo Layout
- `frontend/` — Next.js 16 App Router
- `backend/` — Hono API — auth, user, repository, and the thin/relaying half of triage (chat CRUD + SSE)
- `engine/` (being built) — Python/FastAPI service — the LangGraph/DeepAgents reasoning loop and ALL its
  tools natively in Python (ripgrep, git, and the Docker-sandboxed tsc/lint/test verification loop);
  sibling to `frontend`/`backend`, not a pnpm workspace member
- `packages/shared/` — Shared Zod schemas (source of truth for backend↔frontend contracts only)

## Service Boundaries (3-service system)
- `frontend` talks ONLY to `backend` — never directly to `engine`. This preserves the `hc<AppType>`
  monorepo type-import trick for the whole frontend↔backend contract, engine migration or not.
- `backend` → `engine`: one call, to invoke the agent for a chat message; `backend` relays whatever
  `engine` streams back to the frontend as SSE without needing to understand LangGraph's internal state shape.
- `engine` → `backend`: two narrow HTTP calls only — resolve a repo slug to its local path/metadata, and
  submit a finished bug report. `engine`'s only direct database dependency is its own LangGraph Postgres
  checkpointer table(s); it never touches the Drizzle-owned tables directly.
- Nothing else calls in the reverse direction. If you find yourself wiring a third cross-service call,
  reconsider — the boundary is meant to stay this narrow.

## Build and Dev Commands
All commands should be run from the repository root:
- `pnpm install` — Install all dependencies
- `pnpm --filter @restack/shared build` — Build shared Zod schemas (run first!)
- `pnpm --filter backend dev` — Start Hono dev server on port 3001
- `pnpm --filter frontend dev` — Start Next.js dev server on port 3000
- `pnpm --filter backend db:push` — Push Drizzle schema to PostgreSQL database
- `pnpm --filter backend db:studio` — Open Drizzle Studio database viewer
- `pnpm --filter backend test` — Run Vitest tests
- `engine/` (once scaffolded) has its own commands outside pnpm — e.g. `uvicorn main:app --reload` for the
  dev server, run from inside `engine/` with its own Python virtualenv activated. Document the exact
  commands here once the first `engine/` scaffold lands.

## Architecture Rules: Semi-DDD (Feature-Driven)
Code is organized by business domain/feature, not by file type.

### Backend Layout (`backend/src/domains/[feature]/`)
Each domain has 4 primary files:
- `[feature].routes.ts` — HTTP endpoints & input validation (imports Zod schema from `@restack/shared`)
- `[feature].service.ts` — Pure business logic only (no direct DB access)
- `[feature].repo.ts` — Drizzle queries only (no business logic)
- `[feature].model.ts` — Drizzle table definitions

**Cross-Domain Dependency Rule**: The `auth` domain may import from `user` (e.g. `usersTable` from `user.model.ts`). The `triage` domain may import from `repository` (e.g. `repositoriesTable` from `repository.model.ts`). The reverse dependencies (e.g., user importing from auth, or repository importing from triage) are STRICTLY FORBIDDEN.

**`triage.agent.ts`/`triage.tools.ts` are transitional**: this in-process TypeScript agent is being migrated to the Python `engine/` service (see `update.md`). Don't grow it with new tools/capabilities — add those to the Python engine instead once it exists. `triage.service.ts`/`triage.routes.ts` (chat CRUD + SSE relay) are NOT transitional — they stay in TypeScript permanently.


### Frontend Layout (`frontend/domains/[feature]/`)
- `components/` — UI components (no direct data fetching)
- `hooks/` — Reactive state & data fetching logic
- `services/` — Thin HTTP wrappers around `apiClient`
- `types.ts` — Local TS type declarations
- `frontend/app/` is strictly for layout, routing config, metadata, or entry gates. Do not implement custom JSX layouts, forms, state, or complex components here. Always delegate rendering to domain feature components.

## Shared Schema & DTO Naming Convention
All DTO contracts in `@restack/shared` strictly follow explicit naming semantics:
- **Request Payloads**: Use `<Action><Entity>RequestDTO` (e.g. `LoginRequestDTO`, `RegisterRequestDTO`, `CreateRepositoryRequestDTO`, `UpdateProfileRequestDTO`, `CreateChatSessionRequestDTO`, `CreateMessageRequestDTO`).
- **Response Payloads**: Use `<Entity>ResponseDTO` (e.g. `AuthResponseDTO`, `LogoutResponseDTO`, `UserResponseDTO`, `RepositoryResponseDTO`, `BugReportResponseDTO`, `MessageResponseDTO`, `ChatSessionResponseDTO`).


## Critical Gotcha: Shared Package Build Requirement
`@restack/shared`'s `package.json` resolves to `dist/`, which is gitignored. When editing Zod schemas in `packages/shared/src/schemas/`, you MUST compile them by running:
`pnpm --filter @restack/shared build`
(or keep `pnpm --filter @restack/shared dev` watch mode running in a terminal) or the frontend and backend will fail to resolve the updated types or throw compilation errors.


## Auth & Cookie Strategy
- Short-lived JWT `access_token` (15m) and opaque `refresh_token` (30d) are both set as `httpOnly` cookies at `Path=/`.
- Access tokens are automatically refreshed by the client-side `apiClient` on a 401 response.
- Cookie configuration: `SameSite=None` in production (requires `Secure=true`), and `SameSite=Lax` in development (`Secure=false` since local dev runs on HTTP).
- There is no server-side auth gate (`middleware.ts`/`proxy.ts`) because cookies cannot be read server-side when frontend and backend deploy to unrelated domains (Topology B). Authenticated routes are protected via backend `requireAuth` middleware, and frontend pages are protected via `<RequireAuth>` or client-side checks in hooks.

## Structured & Correlation Logging
- Every incoming HTTP request is tagged with a unique `requestId` via Hono's `requestId` middleware.
- A request-scoped child logger (`logger.child({ requestId })`) is bound to Hono's context.
- In route handlers, always extract the request-specific child logger from Hono's context (`c.get("logger") || logger`) to log events. This ensures all logs generated during a request carry the correct `requestId` and `userId` context (which is automatically enriched by the `requireAuth` middleware).

