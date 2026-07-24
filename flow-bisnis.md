# Business Flow & System Architecture — Smart Bug Triage Agent (Multi-Repo)

## 📌 Gambaran Umum Alur Bisnis (End-to-End Flow)

Sistem ini membagi alur kerja menjadi 2 fase utama:

### 1. Fase Setup & Pemeliharaan Repositori (Domain `repository`)
* **Admin** mendaftarkan repositori target (contoh: `frontend`, `backend`, `auth-service`) melalui Dashboard Admin (Nama, Slug, Remote Git URL, Branch, Local Directory Path).
* **Admin** menekan tombol **"Update Codebase"** (per-repo atau sync-all) untuk memicu proses `git clone` / `git pull` lokal di disk server VPS (`./repos/[slug]`).
* Timestamp `lastSyncedAt` dan log `codebase_sync` dicatat untuk memastikan keterbaruan data kode.

---

### 2. Fase Analisis Bug & Respon (Domain `triage`)

```text
  [ Pengguna mengunggah keluhan bug (Teks & Gambar) di Platform Chat ]
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 1. Bug Analyzer Node                                      │
  │ - Pahami masalah & ekstrak kata kunci pencarian kode      │
  │ - Identifikasi / Klasifikasi target repositori relevan     │
  └───────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 2. Multi-Repo Code Searcher Node                          │
  │ - Pindai folder repositori target (atau seluruh repo)     │
  │ - Eksekusi `ripgrep` lokal di disk server VPS             │
  └───────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 3. Code Reviewer Node                                     │
  │ - Analisis potongan kode & temukan baris sumber masalah   │
  │ - Buat draf rekomendasi perbaikan (Suggested Fix)         │
  └───────────────────────────────────────────────────────────┘
                                │
                                ├───> [ Simpan Bug Report ke Dashboard Tim Internal (dengan Repo ID) ]
                                └───> [ Stream respons penyelesaian singkat ke Pengguna via SSE ]
```

---

## 🛠️ Tech Stack & Keputusan Arsitektur

- **Monorepo Structure**: Menggunakan scaffold "Restack Pattern" — Next.js 16 (App Router) + Hono + Drizzle ORM + PostgreSQL + Zod (`@restack/shared`), pnpm workspaces.
- **Pemisahan Domain (Semi-DDD)**:
  - `backend/src/domains/repository/`: Khusus mengelola aset data repositori (`repositoriesTable`) dan log pemeliharaan (`codebaseSyncTable`).
  - `backend/src/domains/triage/`: Khusus mengelola sesi percakapan bug triage (`threadsTable`, `messagesTable`) serta draf laporan bug (`bugReportsTable`).
- **Code Searcher Engine (Multi-Repo)**: Mengkloning repositori terdaftar ke dalam folder disk VPS (`./repos/[slug]`) dan menjalankan pencarian cepat dengan wrapper `@vscode/ripgrep`. Menghindari batasan rate-limit GitHub Search API.
- **Sinkronisasi Kode**: Dikelola secara manual melalui tombol **"Update Codebase"** (role-gated `admin`). Mendukung sinkronisasi per-repositori maupun sinkronisasi masal.
- **Real-Time Streaming**: Menggunakan Server-Sent Events (SSE) dari Hono untuk menampilkan progres eksekusi node LangGraph secara *real-time* kepada pengguna.
- **LLM Gateway Provider**: Menggunakan [SumoPod](https://sumopod.com) (`https://ai.sumopod.com/v1`) via `@langchain/openai`'s `ChatOpenAI`.
- **Role & Access Control**: Pengguna memiliki 2 level akses: `user` (dapat membuat thread bug report) dan `admin` (akses manajemen repo & dashboard internal bug report).
