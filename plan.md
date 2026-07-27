# Plan Implementasi — Smart Bug Triage Agent (Multi-Repo & Domain-Refactored)

Detail keputusan arsitektur ada di `flow-bisnis.md` dan `DEVELOPMENT.md`. Detail keputusan migrasi TS→Python
Engine (masih berjalan) ada di `update.md`. File ini berisi checklist urutan pengerjaan yang sudah diperbarui.

**Status arsitektur saat ini: 3-service.** `frontend` + `backend` (TypeScript/Hono, lengkap) udah jalan.
`engine` (Python/FastAPI) belum ada — sedang dibangun buat gantiin agent/tools yang sekarang masih jalan
in-process di `backend` (TypeScript). Lihat section "Engine" di bawah buat checklist migrasinya.

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
- [x] `triage.tools.ts` — 7 tools agent (6 dari flow-bisnis.md + `submit_bug_report` buat nyimpen hasil akhir ke `bug_reports`) — **TRANSISIONAL**, lagi diporting ke `engine/` (Python), lihat section Engine di bawah. Jangan tambah tool baru disini.
- [x] `triage.agent.ts` — Deep Agents Harness (`createDeepAgent`), single-agent (semua tools dipegang langsung main agent, tanpa sub-agent terpisah), TodoListMiddleware (`write_todos`), LLM via SumoPod (`@langchain/openai`) — **TRANSISIONAL**, lagi diporting ke `engine/` (Python).
- [ ] `triage.service.ts` — **PERLU DIROMBAK**: dari invoke Deep Agent TS langsung, jadi forward HTTP ke `engine/` + relay stream event yang udah di-shape Engine (todos_updated/message_delta/completed) balik ke `triage.routes.ts`. Checkpointer Postgres pindah jadi milik Engine sepenuhnya, dihapus dari sini.
- [ ] `triage.routes.ts` — **PERLU DIUBAH**: SSE handler jadi relay murni dari stream Engine, gak lagi parsing state LangGraph. Tambah endpoint internal buat Engine manggil `submit_bug_report`.

## Infra — Code Searcher & Verification Sandbox

- [x] `infra/code-search/git.ts` — clone & pull multi-repo target di `./repos/[slug]` pakai `simple-git`. **Tetap TypeScript permanen** (dipakai `repository.service.ts`, bukan tool agent).
- [x] `infra/code-search/ripgrep.ts` — wrapper cari file/baris lintas repositori pakai `@vscode/ripgrep`. **TRANSISIONAL**, lagi diporting ke `engine/` (subprocess ke `rg` native Python).
- [x] `infra/code-search/git-history.ts` — wrapper `git log` & `git blame` untuk lacak riwayat commit. **TRANSISIONAL**, lagi diporting ke `engine/`.
- [x] `infra/verification/sandbox.ts` — **terpecah jadi dua nasib**: `installDependencies()` (dipicu `repository.service.ts` pas sync) **tetap TypeScript permanen**. `runTypeCheck()`/`runLinterAndTests()` (dipanggil tool agent) **TRANSISIONAL**, lagi diporting ke `engine/` sebagai Docker sandbox Python-nya sendiri (security properti sama: path boundary check, `--` separator, `--network none`, resource limit).

## Engine — Python/FastAPI (baru, migrasi dari TypeScript — lihat `update.md` buat rasionalnya)

Alasan migrasi: ekosistem LangGraph/DeepAgents lebih matang di Python + rencana RAG ke depan. Performa
BUKAN alasannya (workload I/O-bound, gak ada beda nyata TS vs Python). Semua tools + Docker sandbox
verifikasi ikut pindah full ke Python (bukan cuma reasoning-nya) — keputusan final setelah beberapa ronde
diskusi arsitektur, effort re-implementasi diterima demi konsistensi satu bahasa di sisi agent.

- [ ] Scaffold `engine/` (FastAPI app + dependency file Python, sibling folder `frontend`/`backend`, bukan bagian pnpm workspace)
- [ ] Port `triage.tools.ts` → tools native Python: `ripgrep_search` (subprocess `rg`), `read_repo_file` (`pathlib`, guard path-traversal sama persis), `git_log_blame` (subprocess `git`, `--` separator dipertahankan), `trace_dependencies`
- [ ] Port Docker verification sandbox → `tsc_no_emit`/`run_linter_and_tests` native Python (`subprocess` ke `docker` CLI), security properti sama persis: `--network none`, resource limit, `node:20-slim`
- [ ] Port `triage.agent.ts` → LangGraph/DeepAgents Python harness (single-agent, tetap 7 tools, system prompt sama)
- [ ] Checkpointer Postgres milik Engine sendiri (tabel terpisah dari Drizzle) — satu-satunya koneksi DB langsung Engine
- [ ] `submit_bug_report` — HTTP call ke endpoint internal Backend (bukan tulis `bug_reports` langsung)
- [ ] Resolve repo slug → localPath/metadata — HTTP call ke endpoint internal Backend (bukan baca `repositories` langsung)
- [ ] Expose endpoint (`POST /agent/invoke` atau serupa) yang dipanggil `triage.service.ts`, stream event yang udah di-shape (`todos_updated`/`message_delta`/`completed`)

## Wiring

- [x] Register `repositoryRoutes` & `triageRoutes` di `hono-app.ts` (di-smoke-test: server boot normal, kedua route group respond 401 Unauthorized - bukan 404 - buat request tanpa auth)
- [ ] `repository.routes.ts` — tambah endpoint internal buat Engine resolve repo slug → path/metadata
- [ ] `triage.routes.ts` — tambah endpoint internal buat Engine submit bug report
- [ ] `triage.service.ts`/`triage.routes.ts` dirombak jadi forward+relay ke Engine (lihat catatan di section triage di atas)

## Frontend

- [x] Selector repositori & Halaman chat (kirim message + image + pilih target repo, konsumsi SSE)
- [x] Dashboard internal (list bug report per repo, role-gated `admin`, manajemen repo + tombol "Update Codebase" & timestamp last synced)

## Fondasi (Selesai)

- [x] Refactor pemisahan domain `repository` dan domain `triage`
- [x] Kolom `role` (`user`/`admin`) di `usersTable` + propagasi ke JWT & middleware `requireRole`
- [x] `.env` backend + migrasi `db:push` ke `bug_analyzer_code_db`
- [x] Install dependencies: `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph-checkpoint-postgres`, `simple-git`, `@vscode/ripgrep`, `deepagents`, `langchain`
