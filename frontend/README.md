# RestackPattern - Frontend App (Next.js)

This is the Next.js 16 (App Router) frontend app for the RestackPattern monorepo. It uses a Semi-DDD folder structure, vanilla CSS, and connects to Hono through its official RPC client (`hc<AppType>`), giving end-to-end type inference on every request/response without manually declaring types.

## Directory Structure (Semi-DDD)

Code is structured by business domain/feature:

```
src/
├── app/                     # Routing configs, layouts, pages (no complex JSX/state here!)
├── shared/                  # Reusable components, client wrappers, hooks
│   ├── components/ui/       # Component primitives (e.g. Shadcn atoms)
│   └── lib/api-client.ts    # Hono RPC client (hc<AppType>) + auto session refresh
└── domains/
    ├── auth/                # Login/Register components, auth services, hooks
    └── user/                # User profile UI components, hooks
```

### Folder Rules:
- `app/` is strictly for routing and page wrappers. Do not implement complex forms, state, or layouts directly here. Always delegate rendering to domain feature components.
- `domains/[feature]/components` - UI components specific to the business feature.
- `domains/[feature]/hooks` - Handles fetching, mutations, and local state.
- `domains/[feature]/services` - Small wrappers making API requests.

---

## Development

Ensure the backend API is running at `http://localhost:3001`.

```bash
# 1. Optional - configure environment variables (defaults to localhost:3001)
cp .env.example .env

# 2. Start Next.js development server
pnpm dev
```

- Dev server will run at [http://localhost:3000](http://localhost:3000).
- Runs with Turbopack enabled for lightning-fast hot reloading.
