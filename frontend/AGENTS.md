<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Frontend Conventions

- **Domain-driven**: `domains/<feature>/` with `components/`, `hooks/`, `services/`, `types.ts`
- **`app/` is routing/layout only** — never put forms, state, or complex JSX directly in `app/`; delegate to domain components
- **API client**: `lib/api-client.ts` wraps `hc<AppType>` with auto-refresh on 401 (deduped via shared `refreshPromise`)
- **Auth**: `<RequireAuth>` component for page-level protection, hook-level checks for finer control
- **UI components**: shadcn/ui in `components/ui/` (button, card, input, textarea, badge, label)

## Commands

```bash
pnpm --filter frontend dev                # Next.js dev server (Turbopack), http://localhost:3000
pnpm --filter frontend lint               # ESLint
```

## Key Gotchas

- **Next.js 16 breaking changes** — always check `node_modules/next/dist/docs/` before writing code
- **`@restack/shared` must be built** after schema edits — run `pnpm --filter @restack/shared build` or keep its `dev` watcher running
- **Frontend talks ONLY to backend** (port 3001) — never directly to engine (port 8000)
- **SSE streaming**: Chat messages use Server-Sent Events from `POST /api/triage/chat-sessions/:id/messages`
