import "dotenv/config"
import { z } from "zod";

const envSchema = z.object({
  // Memastikan DATABASE_URL ada dan berformat URL valid
  DATABASE_URL: z.string().url("DATABASE_URL harus berupa URL yang valid"),
  // Minimal 32 karakter supaya HS256 secret tidak mudah di-brute-force
  JWT_SECRET: z.string().min(32, "JWT_SECRET wajib diisi, minimal 32 karakter"),
  // Validasi enum dengan nilai default "development"
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Mengubah string dari process.env menjadi Number secara otomatis
  PORT: z.coerce.number().default(3001),
  // Validasi cookie samesite dengan nilai default "Lax"
  COOKIE_SAME_SITE: z.enum(["Lax", "None", "Strict", ""]).default(""),
  // Set only when FE and BE share a registrable domain via subdomains
  // (e.g. ".example.com" for app.example.com + api.example.com) — lets
  // the frontend's own middleware read the session cookies too.
  COOKIE_DOMAIN: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  LOG_FILE_PATH: z.string().optional(),

  // LLM gateway - provider-agnostic lewat format Chat Completions ala-OpenAI.
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY wajib diisi"),
  // Kosongkan kalau pake OpenAI resmi, isi kalau pakai gateway lain.
  LLM_BASE_URL: z.string().url("LLM_BASE_URL harus berupa URL yang valid").optional(),
  // Nama model sesuai provider
  LLM_MODEL: z.string().default("gpt-5-mini"),
})

export const env = envSchema.parse(process.env)