## MVP

## Arsitektur "Smart Bug Triage" Agent

Untuk proyek praktek kamu, kita bisa mendesain grafnya di **Langchain / LangGraph** dengan alur seperti ini:

```
    [User punya masalah, tinggal deskripsiin masalah di platform chat yang sudah disediakan, support image input untuk mempermudah pengguna dan AI dalam memahami masalah]
              │
              ▼
     ┌─────────────────┐
     │ 1. Bug Analyzer │ (Pahami masalah & ekstrak kata kunci)
     └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │2. Code Searcher │ (Cari file & baris kode yang relevan melalui github / version control yang ada)
     └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │   3. Reviewer   │ (Analisis baris kode + buat draf perbaikan)
     └─────────────────┘
              │
              ▼
 [Kirim hasil bug ini ke tim internal, (Lokasi file, perkiraan baris, alasan, & saran kode)]
 [Kirim response ke user, bahwa masalah sudah kami temukan "jelasin singkat", dan tim internal kami sedang memperbaikinya]
```

## Tech Stack & Keputusan Arsitektur

- **Monorepo**: pakai scaffold sendiri ("Restack Pattern") — Next.js 16 (App Router) + Hono + Drizzle ORM + PostgreSQL + Zod (shared schema), pnpm workspaces. FE & BE sudah terpisah sejak awal (bukan keputusan baru), auth (JWT access+refresh via httpOnly cookie) & domain `user` sudah ada dan di-reuse.
- **Deploy target**: VPS / server sendiri, bukan Vercel serverless (`vercel.json` di scaffold cuma sisa boilerplate, gak dipakai) — jadi filesystem persistent tersedia.
- **Code Searcher**: clone repo sekali ke disk VPS + search pakai `ripgrep` (bukan GitHub Search API — hindari rate limit 10 req/menit & batasan default-branch-only/384KB file size).
- **Sinkronisasi clone**: manual, lewat tombol **"Update Codebase"** di dashboard internal (role-gated, reuse `requireAuth`) yang trigger `git pull`. Bukan webhook (hindari masalah timeout 10s, no-auto-retry, public exposure) atau cron. Tampilkan timestamp "last synced" di sebelah tombol biar tim tahu seberapa stale codebase-nya.
- **Request-response mode**: SSE (Server-Sent Events) dari Hono, buat stream progress tiap node (Analyzer → Searcher → Reviewer) ke user, hindari timeout & UX nunggu tanpa feedback.
- **LangGraph**: jalan di backend (Hono), domain baru `domains/triage/` (ikut pola `*.routes/service/repo/model`), graph/node LLM taruh di `triage.graph.ts`.
- **Chat/thread persistence**: LangGraph checkpointer (Postgres) buat state percakapan per-thread; tabel tipis tambahan cuma buat listing thread per user di UI.
- **Delivery ke tim internal**: bukan Slack/email, tapi dashboard di app yang sama, di-filter/protect berdasarkan role user.
- **LLM Provider**: [SumoPod](https://sumopod.com) — gateway OpenAI-compatible (`https://ai.sumopod.com/v1`) yang cover Claude, GPT, Gemini, dkk di satu endpoint. Pakai `@langchain/openai`'s `ChatOpenAI` diarahin ke `baseURL` SumoPod, model dipilih via string/env var — gak perlu SDK per-provider (`@langchain/anthropic`, dll).
- **Repo target**: private, akun GitHub milik sendiri. Masih local dev sekarang, jadi `git clone`/`pull` pakai credential lokal (SSH key/credential manager) yang udah ada — belum perlu setup PAT/deploy key terpisah. Baru dibutuhkan pas deploy ke VPS.
- **Role**: 2 level standar — `user` (default) & `admin`. Tambah kolom `role` di `usersTable`.
