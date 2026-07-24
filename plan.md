# Plan Implementasi — Smart Bug Triage Agent (Multi-Repo & Domain-Refactored)

Detail keputusan arsitektur ada di `flow-bisnis.md` dan `DEVELOPMENT.md`. File ini berisi checklist urutan pengerjaan yang sudah diperbarui.

## Backend — domain `repository` (`backend/src/domains/repository/`)

- [x] `repository.model.ts` — tabel `repositories`, `codebase_sync`
- [x] `repository.repo.ts` — query layer (CRUD repositories, logCodebaseSync, getLastCodebaseSync)
- [ ] `repository.service.ts` — business logic manajemen repo & trigger git pull/clone
- [ ] `repository.routes.ts` — HTTP endpoints CRUD repo & sync (role-gated `admin`)

## Backend — domain `triage` (`backend/src/domains/triage/`)

- [x] `triage.model.ts` — tabel `threads`, `messages`, `bug_reports` (import `repositoriesTable` dari domain repository)
- [x] `packages/shared/src/schemas/repository.schema.ts` — Zod schema & DTO untuk Repository & CodebaseSync
- [x] `packages/shared/src/schemas/triage.schema.ts` — Zod schema & DTO untuk Thread, Message, & BugReport
- [x] `triage.repo.ts` — query layer (create/list thread, message, bug report, listBugReportsWithDetails)
- [ ] `triage.graph.ts` — LangGraph 3-node (Bug Analyzer → Multi-Repo Code Searcher → Reviewer), LLM via SumoPod (`@langchain/openai` + custom `baseURL`)
- [ ] `triage.service.ts` — invoke graph, wire Postgres checkpointer (state percakapan per-thread)
- [ ] `triage.routes.ts` — endpoint SSE buat stream progress tiap node ke user

## Infra — Code Searcher

- [ ] `infra/code-search/git.ts` — clone & pull multi-repo target di `./repos/[slug]` pakai `simple-git`
- [ ] `infra/code-search/ripgrep.ts` — wrapper cari file/baris lintas repositori pakai `@vscode/ripgrep`

## Wiring

- [ ] Register `repositoryRoutes` & `triageRoutes` di `hono-app.ts`

## Frontend

- [ ] Selector repositori & Halaman chat (kirim message + image + pilih target repo, konsumsi SSE)
- [ ] Dashboard internal (list bug report per repo, role-gated `admin`, manajemen repo + tombol "Update Codebase" & timestamp last synced)

## Fondasi (Selesai)

- [x] Refactor pemisahan domain `repository` dan domain `triage`
- [x] Kolom `role` (`user`/`admin`) di `usersTable` + propagasi ke JWT & middleware `requireRole`
- [x] `.env` backend + migrasi `db:push` ke `bug_analyzer_code_db`
- [x] Install dependencies: `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph-checkpoint-postgres`, `simple-git`, `@vscode/ripgrep`
