# Plan Implementasi — Smart Bug Triage Agent

Detail keputusan arsitektur ada di `flow-bisnis.md`. File ini cuma checklist urutan pengerjaan.

## Backend — domain `triage` (`backend/src/domains/triage/`)

- [x] `triage.model.ts` — tabel `threads`, `messages`, `bug_reports`, `codebase_sync`
- [x] `packages/shared/src/schemas/triage.schema.ts` — Zod schema & DTO shared FE/BE
- [x] `triage.repo.ts` — query layer (create/list thread, message, bug report, codebase sync log)
- [ ] `triage.graph.ts` — LangGraph 3-node: Bug Analyzer → Code Searcher → Reviewer, LLM via SumoPod (`@langchain/openai` + custom `baseURL`)
- [ ] `triage.service.ts` — invoke graph, wire Postgres checkpointer (state percakapan per-thread)
- [ ] `triage.routes.ts` — endpoint SSE buat stream progress tiap node ke user
- [ ] `codebase-sync.routes.ts` (atau nempel di triage.routes) — endpoint "Update Codebase" (role-gated admin), trigger git pull

## Infra — Code Searcher

- [ ] `infra/code-search/git.ts` — clone (sekali) & pull repo target pakai `simple-git`
- [ ] `infra/code-search/ripgrep.ts` — wrapper cari file/baris pakai `@vscode/ripgrep`

## Wiring

- [ ] Register `triageRoutes` di `hono-app.ts`

## Frontend

- [ ] Halaman chat (kirim message + image, konsumsi SSE buat progress bar)
- [ ] Dashboard internal (list bug report, role-gated `admin`, tombol "Update Codebase" + timestamp last synced)

## Sudah beres duluan (fondasi)

- [x] Kolom `role` (`user`/`admin`) di `usersTable` + propagasi ke JWT & middleware `requireRole`
- [x] Fix bug `AuthVariables` di `require-auth.test.ts`
- [x] `.env` backend + migrasi `db:push` ke `bug_analyzer_code_db`
- [x] Install dependencies: `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph-checkpoint-postgres`, `simple-git`, `@vscode/ripgrep`
