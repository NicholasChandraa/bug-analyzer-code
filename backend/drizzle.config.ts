import { defineConfig } from "drizzle-kit"
import "dotenv/config"

export default defineConfig({
  schema: "./src/domains/*/*.model.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // LangGraph's Postgres checkpointer (engine/) owns the checkpoint_* tables directly via its own
  // setup migration, not via Drizzle - exclude them so `db:push` never proposes dropping them.
  tablesFilter: ["!checkpoint*"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
