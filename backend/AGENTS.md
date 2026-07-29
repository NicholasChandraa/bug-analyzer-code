# Backend (Hono) — Agent Instructions

See `.github/copilot-instructions.md` for the full project guide.

## Key Backend Conventions

- **Semi-DDD**: `*.model.ts` / `*.repo.ts` / `*.service.ts` / `*.routes.ts` per domain in `src/domains/<feature>/`
- **Cross-domain rule**: `auth` → `user`, `triage` → `repository` (one-directional, never reverse)
- **`hono-app.ts`** is the single source of truth — entry points (`index.ts`, `api/index.ts`) are thin wrappers
- **Auth**: Dual-token cookie (JWT 15min + opaque refresh 30d), `requireAuth`/`requireRole(role)` middleware
- **Logging**: Always use `c.get("logger") || logger` in route handlers
- **`noUncheckedIndexedAccess`**: Drizzle array destructure → `const [row] = await ...` → `return row ?? null`
- **Testing**: Vitest, colocated `*.test.ts`, mock repo layer with `vi.mock("./x.repo.js", ...)`

## Commands

```bash
pnpm --filter backend dev                 # Hono dev server (tsx watch), http://localhost:3001
pnpm --filter backend test                # Vitest
pnpm --filter backend test -- path/to/file.test.ts   # single file
pnpm --filter backend test -- -t "test name"         # by name
pnpm --filter backend db:push             # push Drizzle schema
pnpm --filter backend db:generate         # generate SQL migrations
pnpm --filter backend db:studio           # Drizzle Studio GUI
```

## Engine Communication

Backend relays agent requests to Engine via `POST /agent/invoke` and streams NDJSON back as SSE. Engine calls Backend's internal endpoints (`/api/repositories/internal/*`, `/api/triage/internal/bug-reports`) — these are NOT behind `requireAuth` (network-level isolation only).

## What NOT to do

- Do NOT add agent/tool logic to `backend/` — all agent capabilities go in `engine/`
- Do NOT add server-startup logic to `index.ts` or `api/index.ts` — it belongs in `hono-app.ts`
- Do NOT add `requireAuth`/`requireRole` to internal endpoints used by Engine
