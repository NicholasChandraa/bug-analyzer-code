# Plan Implementasi — Smart Bug Triage Agent (Multi-Repo & Domain-Refactored)

Detail keputusan arsitektur ada di `flow-bisnis.md` dan `DEVELOPMENT.md`. File ini berisi checklist urutan pengerjaan yang sudah diperbarui.

## Backend — domain `repository` (`backend/src/domains/repository/`)

- [x] `repository.model.ts` — tabel `repositories`, `codebase_sync`
- [x] `repository.repo.ts` — query layer (CRUD repositories, logCodebaseSync, getLastCodebaseSync)
- [x] `repository.service.ts` — business logic manajemen repo & trigger git pull/clone + install dependency lewat Docker sandbox
- [x] `repository.routes.ts` — HTTP endpoints CRUD repo & sync (role-gated `admin`)

## Backend — domain `triage` (`backend/src/domains/triage/`)

- [x] `triage.model.ts` — tabel `chat_sessions`, `messages`, `bug_reports` (import `repositoriesTable` dari domain repository)
- [x] `packages/shared/src/schemas/repository.schema.ts` — Zod schema & DTO untuk Repository & CodebaseSync
- [x] `packages/shared/src/schemas/triage.schema.ts` — Zod schema & DTO untuk ChatSession, Message, & BugReport
- [x] `triage.repo.ts` — query layer (create/list chat session, message, bug report, listBugReportsWithDetails)
- [x] `triage.tools.ts` — 7 tools agent (6 dari flow-bisnis.md + `submit_bug_report` buat nyimpen hasil akhir ke `bug_reports`)
- [x] `triage.agent.ts` — Deep Agents Harness (`createDeepAgent`), single-agent (semua tools dipegang langsung main agent, tanpa sub-agent terpisah), TodoListMiddleware (`write_todos`), LLM via SumoPod (`@langchain/openai`)
- [x] `triage.service.ts` — invoke Deep Agent, wire Postgres checkpointer (state percakapan per-session via `chatSessionId`)
- [x] `triage.routes.ts` — endpoint SSE buat stream progress To-Do list, tool execution, & perbaikan kode ke user

## Infra — Code Searcher & Verification Sandbox

- [x] `infra/code-search/git.ts` — clone & pull multi-repo target di `./repos/[slug]` pakai `simple-git`
- [x] `infra/code-search/ripgrep.ts` — wrapper cari file/baris lintas repositori pakai `@vscode/ripgrep`
- [x] `infra/code-search/git-history.ts` — wrapper `git log` & `git blame` untuk lacak riwayat commit
- [x] `infra/verification/sandbox.ts` — Docker sandbox (`node:20-slim`, `--rm`, resource-limited) buat `pnpm install` (network diizinkan), `npx tsc --noEmit`, `pnpm run lint`, dan `pnpm test` (`--network none`) - repo tetap di disk host, cuma eksekusinya yang di-container

## Wiring

- [x] Register `repositoryRoutes` & `triageRoutes` di `hono-app.ts` (di-smoke-test: server boot normal, kedua route group respond 401 Unauthorized - bukan 404 - buat request tanpa auth)

## Frontend

- [x] Selector repositori & Halaman chat (kirim message + image + pilih target repo, konsumsi SSE)
- [x] Dashboard internal (list bug report per repo, role-gated `admin`, manajemen repo + tombol "Update Codebase" & timestamp last synced)

## Fondasi (Selesai)

- [x] Refactor pemisahan domain `repository` dan domain `triage`
- [x] Kolom `role` (`user`/`admin`) di `usersTable` + propagasi ke JWT & middleware `requireRole`
- [x] `.env` backend + migrasi `db:push` ke `bug_analyzer_code_db`
- [x] Install dependencies: `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph-checkpoint-postgres`, `simple-git`, `@vscode/ripgrep`, `deepagents`, `langchain`
