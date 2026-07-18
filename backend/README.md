# RestackPattern - Backend API (Hono)

This is the Hono backend API for the RestackPattern monorepo. It features structured, context-scoped correlation logging (Pino), database interaction via Drizzle ORM, and a secure dual-cookie JWT refresh token authentication flow.

## Directory Structure (Semi-DDD)

Code is structured by business domain/feature:

```
src/
├── config/                  # Environment variables validation (env.ts)
├── shared/                  # Reusable utilities across domains
│   ├── db/                  # Drizzle connection client
│   ├── logger/              # Pino logger instance and type definitions
│   └── middlewares/         # requireAuth, etc.
└── domains/
    ├── auth/                # Auth routes, service, repo, and model
    └── user/                # User routes, service, repo, and model
```

### Domain Architecture Layer Rules:
- `*.routes.ts` - Handles HTTP requests, validates input schemas (from `@restack/shared`), calls service logic, and returns JSON.
- `*.service.ts` - Houses core business workflows, password hashing, and token issuance. Does not write SQL or run DB queries directly.
- `*.repo.ts` - Houses Drizzle DB query executions. No business logic.
- `*.model.ts` - Defines Drizzle database tables.

---

## Development

Prerequisites: A running PostgreSQL database (e.g. [Neon](https://neon.tech) or a local instance).

```bash
# 1. Create env file and configure DATABASE_URL and JWT_SECRET
cp .env.example .env

# 2. Push schema to database
pnpm db:push

# 3. Start development watcher
pnpm dev
```

### Core Commands (Run from backend folder)
- `pnpm dev` - Starts development server at `http://localhost:3001` (uses tsx watch)
- `pnpm db:push` - Pushes Drizzle schemas to PostgreSQL database
- `pnpm db:generate` - Generates Drizzle SQL migrations
- `pnpm db:studio` - Starts Drizzle Studio GUI database viewer
- `pnpm test` - Runs unit and integration test suites using Vitest
