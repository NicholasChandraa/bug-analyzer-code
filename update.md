# Update — Repo Context Awareness & Multi-Stack Verification

Catatan desain hasil diskusi (belum diimplementasi) — dibuat sebelum eksekusi biar keputusannya kecatet.

## Latar Belakang / Masalah

- Kalau admin daftarin banyak repo (misal 10+), user/agent perlu cara buat tau repo mana yang dimaksud pas ada laporan bug.
- Agent juga perlu kerasa "kenal" project spesifik (tech stack, deskripsi, konteks bisnis) biar jawabannya relevan, bukan generik ke semua project.
- Gak semua repo itu JavaScript/TypeScript (contoh: kantor user ada yang masih pakai Java 7) — tool verifikasi (`tsc_no_emit`, `run_linter_and_tests`) yang sekarang cuma jalan buat JS/TS gak boleh dipaksain ke semua repo.

## Keputusan

### 1. Repo Selection / Disambiguation

- Default UX: user pilih repo secara eksplisit pas bikin chat session baru (dropdown/list), bukan auto-search semua repo.
- "Search semua repo" (`chatSessionsTable.repositoryId` = null) tetap ada sebagai opsi eksplisit buat kasus "gak tau di project mana" — bukan default, biar gak lambat/mahal & rawan salah tebak kalau jumlah repo makin banyak (nama fungsi/pattern kode yang mirip antar-project).

### 2. Field baru di `repositoriesTable`

- **`techStack`** (required, string) — contoh: `"Java 7, Struts 2, Oracle DB"`. Field terpisah & wajib diisi (bukan digabung ke description), biar admin gak lupa nyebutin.
- **`description`** (required, string) — penjelasan project: fungsinya buat apa, konteks bisnis, catatan khusus/known issues.
- **`verificationRuntime`** (required, enum: `"javascript" | "none"`) — flag FUNGSIONAL (bukan buat dibaca LLM), dipakai program buat mutusin apakah `tsc_no_emit`/`run_linter_and_tests` boleh dicoba jalan sama sekali. Kalau `"none"`, kedua tool langsung return "gak relevan, dilewati" tanpa nyoba jalanin Docker.

Kenapa `verificationRuntime` dipisah dari `techStack`/`description`: dua field itu buat konteks narasi LLM, sedangkan `verificationRuntime` murni buat gating logic program — beda concern, jangan digabung/ditebak dari string matching yang rawan salah (misal "Java" vs "JavaScript").

### 3. Context Injection ke AI Agent

- `techStack` + `description` digabung jadi satu blok teks, disuntikin sebagai **system message baru** — bukan system prompt statis punya agent (yang di-set sekali & di-share semua sesi), dan bukan digabung ke teks pesan user.
- **Kenapa system message, bukan digabung ke user message:** model nge-treat role `system` beda dibanding `user` — `system` dianggep instruksi/konteks yang "nempel" terus sepanjang percakapan, sedangkan `user` dianggep pertanyaan yang perlu direspon. Kalau digabung ke teks user, bisa salah atribusi atau bobotnya kurang nempel di reasoning model.
- **Kenapa cuma di pesan pertama, bukan tiap pesan:** checkpointer LangGraph (Postgres) nyimpen seluruh history percakapan termasuk system message ini, jadi otomatis "diinget" di turn-turn berikutnya tanpa perlu dikirim ulang.
- **Deteksi "pesan pertama":** pakai `baselineMessageCount` yang udah ada di `triage.service.ts` (dihitung via `agent.getState()` sebelum invoke, awalnya dibikin buat fix bug replay SSE) — kalau nilainya `0`, berarti sesi ini baru.
- **Gak bocor ke user:** system message ini gak ditulis ke `messagesTable` (tabel chat history yang ditampilin ke user — itu cuma isi teks asli user lewat `triageRepo.addMessage`), dan otomatis gak muncul di SSE stream karena filter `message.type !== "ai"` yang udah ada di `triage.routes.ts`.
- Catatan kecil: balasan agent bisa aja "keceplosan" ngerefer ke konteks yang disuntikin dengan cara yang aneh (misal "seperti yang kamu bilang..." padahal itu bukan kata-kata user) — bisa dimitigasi lewat instruksi di system message-nya ("info ini buat konteks kamu aja, jangan diulang mentah-mentah ke user").

### 4. Verifikasi Multi-Stack

- `tsc_no_emit`/`run_linter_and_tests` sekarang hardcoded asumsi JS/TS (`npx tsc --noEmit`, `pnpm run lint`/`pnpm test`).
- Dengan `verificationRuntime`, kedua tool cek dulu field ini dari repo yang di-resolve (lewat `resolveRepoPath`) — kalau `"none"`, return pesan "repo ini bukan JavaScript/TypeScript, verifikasi dilewati" tanpa coba jalanin Docker sama sekali (hemat waktu, gak ngasih output ngaco).
- Dukungan bahasa lain (Java/Python/Go/dst, masing-masing butuh runner sendiri: maven/gradle, pytest, go test) sengaja BELUM dibangun sekarang — scope-nya besar & belum ada yang minta. `verificationRuntime` cuma 2 nilai dulu (`"javascript" | "none"`), gampang di-extend jadi enum lebih banyak nanti kalau beneran butuh.

## Yang perlu diubah pas implementasi

- `packages/shared/src/schemas/repository.schema.ts` — tambah `techStack`, `description`, `verificationRuntime` ke `CreateRepositorySchema`/`UpdateRepositorySchema`/`RepositoryResponseDTO`.
- `backend/src/domains/repository/repository.model.ts` — tambah 3 kolom baru + migrasi Drizzle (`db:generate`/`db:push`).
- `backend/src/infra/verification/sandbox.ts` — `runTypeCheck`/`runLinterAndTests` terima/cek `verificationRuntime`, short-circuit kalau `"none"`.
- `backend/src/domains/triage/triage.tools.ts` — tool `tsc_no_emit`/`run_linter_and_tests` resolve `verificationRuntime` dari repo record sebelum manggil sandbox.
- `backend/src/domains/triage/triage.service.ts` — helper compose system message konteks (`techStack` + `description`), inject ke `messages` array pas `baselineMessageCount === 0`.
- `backend/src/domains/triage/triage.agent.ts` — system prompt utama ditambah catatan: "tsc_no_emit/run_linter_and_tests cuma relevan buat repo JavaScript/TypeScript - kalau tool bilang gak relevan, itu bukan error, jangan diulang-ulang."
- Frontend (belum dikerjain): form registrasi repo butuh 3 field baru itu (semua required), plus selector repo eksplisit pas bikin chat session baru.

### 5. Arsitektur Orchestrator Agent & Sub-Agent (Expansion Design)

- **Latar Belakang Expansion**:
  - Untuk mendukung kebutuhan skala enterprise/kantor (banyak project, use-case tidak terbatas pada bug triage tetapi bisa mencakup Code Review, Security Audit, Feature Spec Generator di masa depan), arsitektur agent ditingkatkan dari Single-Agent murni menjadi **Orchestrator (Supervisor) Pattern**.

- **Struktur Agent Baru (`backend/src/domains/triage/agents/`)**:
  - **`orchestrator.agent.ts` (Main Orchestrator Agent)**:
    - Bertindak sebagai entry point utama yang menerima prompt user.
    - Mengklasifikasikan niat (*intent classification*) pengguna.
    - Memegang `TodoListMiddleware` untuk mengelola *global plan* (`write_todos`).
    - Didelegasikan tugas ke sub-agents via daftar `subagents`: `[triageAndFixSubAgent, ...]`.
  - **`triage-fix.subagent.ts` (Triage & Fix Sub-Agent)**:
    - Hasil refaktor dari `triage.agent.ts` yang ada saat ini.
    - Memegang 7 tools investigasi & verifikasi (`ripgrep_search`, `read_repo_file`, `git_log_blame`, `trace_dependencies`, `tsc_no_emit`, `run_linter_and_tests`, `submit_bug_report`).
    - Memiliki `name`, `description`, dan `systemPrompt` terisolasi khusus untuk analisis bug & perbaikan kode.

- **Alur Eksekusi Multi-Agent**:
  1. User mengirim pesan chat ke Hono Backend (`triage.service.ts`).
  2. `triage.service.ts` memanggil `OrchestratorAgent.stream()`.
  3. `OrchestratorAgent` menganalisis permintaan, membuat To-Do list global, dan menugaskan `Triage & Fix Sub-Agent`.
  4. `Triage & Fix Sub-Agent` mengeksekusi pencarian ripgrep, membaca file, serta verifikasi Docker sandbox (`tsc_no_emit`, `run_linter_and_tests`), lalu mengembalikan hasil/patch terverifikasi ke Orchestrator.
  5. `OrchestratorAgent` menyusun jawaban akhir terverifikasi dan mengirimkannya ke user via **SSE stream**.

- **Rencana Perubahan Kode Saat Implementasi**:
  - `backend/src/domains/triage/triage.agent.ts` $\rightarrow$ Di-refactor menjadi folder `backend/src/domains/triage/agents/` berisi `orchestrator.agent.ts` dan `triage-fix.subagent.ts`.
  - `backend/src/domains/triage/triage.service.ts` $\rightarrow$ Menggunakan `createOrchestratorAgent(checkpointer)` alih-alih `createTriageAgent`.
  - Database Schema & SSE Stream $\rightarrow$ **Tidak ada breaking changes**, format SSE dan Postgres checkpointer (`chat_sessions`) tetap 100% kompatibel.

**Status: Desain Repo Context Awareness, Multi-Stack Verification, dan Orchestrator Sub-Agent Architecture disepakati dalam update.md — siap diimplementasikan.**

