# DEVELOPMENT.md

This document outlines the architecture, build guidelines, and code conventions for the Restack Pattern monorepo. All developers and automated tools contributing to this project must follow these rules.

## Project Stack
- **Frontend**: Next.js 16 (App Router)
- **Backend**: Hono
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (Postgres-js driver)
- **Validation**: Zod (shared schemas)
- **Package Manager**: pnpm workspaces

## Monorepo Layout
- `frontend/` — Next.js 16 App Router
- `backend/` — Hono API
- `packages/shared/` — Shared Zod schemas (the single source of truth)

## Build and Dev Commands
All commands should be run from the repository root:
- `pnpm install` — Install all dependencies
- `pnpm --filter @restack/shared build` — Build shared Zod schemas (run first!)
- `pnpm --filter backend dev` — Start Hono dev server on port 3001
- `pnpm --filter frontend dev` — Start Next.js dev server on port 3000
- `pnpm --filter backend db:push` — Push Drizzle schema to PostgreSQL database
- `pnpm --filter backend db:studio` — Open Drizzle Studio database viewer
- `pnpm --filter backend test` — Run Vitest tests

## Architecture Rules: Semi-DDD (Feature-Driven)
Code is organized by business domain/feature, not by file type.

### Backend Layout (`backend/src/domains/[feature]/`)
Each domain has 4 primary files:
- `[feature].routes.ts` — HTTP endpoints & input validation (imports Zod schema from `@restack/shared`)
- `[feature].service.ts` — Pure business logic only (no direct DB access)
- `[feature].repo.ts` — Drizzle queries only (no business logic)
- `[feature].model.ts` — Drizzle table definitions

**Cross-Domain Dependency Rule**: The `auth` domain may import from `user` (e.g. `usersTable` from `user.model.ts`). The reverse (user importing from auth) is STRICTLY FORBIDDEN.

### Frontend Layout (`frontend/domains/[feature]/`)
- `components/` — UI components (no direct data fetching)
- `hooks/` — Reactive state & data fetching logic
- `services/` — Thin HTTP wrappers around `apiClient`
- `types.ts` — Local TS type declarations
- `frontend/app/` is strictly for layout, routing config, metadata, or entry gates. Do not implement custom JSX layouts, forms, state, or complex components here. Always delegate rendering to domain feature components.

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

