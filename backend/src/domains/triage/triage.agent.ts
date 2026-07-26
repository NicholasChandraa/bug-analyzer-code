import { createDeepAgent } from "deepagents";
import { getChatModel } from "../../infra/llm/get-chat-model.js";
import {
    ripgrepSearchTool,
    readRepoFileTool,
    gitLogBlameTool,
    traceDependenciesTool,
    tscNoEmitTool,
    runLinterAndTestsTool,
    submitBugReportTool,
} from "./triage.tools.js";

/** Ekstraksi tipe data opsional dari parameter pertama fungsi `createDeepAgent` */
type CreateDeepAgentOptions = NonNullable<Parameters<typeof createDeepAgent>[0]>

/** Tipe data checkpointer untuk menyimpan status percakapan (state) agen */
type Checkpointer = CreateDeepAgentOptions["checkpointer"]

/**
 * System Prompt utama yang mengarahkan alur kerja agen Triage:
 * 1. Membuat daftar rencana investigasi (todos).
 * 2. Mencari akar masalah bug di repositori target menggunakan tools.
 * 3. Menyusun draf perbaikan (unified diff patch).
 * 4. Memverifikasi perbaikan dengan typecheck (`tsc_no_emit`) dan testing (`run_linter_and_tests`).
 * 5. Melaporkan hasil perbaikan yang telah diverifikasi.
 */
const SYSTEM_PROMPT = `You are the Smart Bug Triage Agent for a multi-repo codebase.

Given a user's bug report (text, optionally a screenshot description), you must:
1. Use write_todos to plan your investigation.
2. Investigate the root cause yourself: use ripgrep_search to locate relevant code, read_repo_file to inspect it, and git_log_blame/trace_dependencies to understand history and blast radius.
3. Once you know the root cause, draft a unified diff patch for the affected file(s).
4. Verify the patch by running tsc_no_emit and run_linter_and_tests against the affected repo.
5. If verification fails, read the error trace, revise the patch, and repeat step 4 until it passes, or you determine it can't be auto-fixed.
6. Once verification passes, call submit_bug_report exactly once with the repo slug, affected file path, root cause, and the diff - this is how the fix gets saved.
7. Reply to the user with the final verified fix: repo/files touched, root cause summary, and the diff.

Never call submit_bug_report before tsc_no_emit and run_linter_and_tests have both passed.`

/**
 * Pabrik (*Factory function*) untuk menginstansiasi Smart Bug Triage Agent.
 * 
 * Agen ini dilengkapi dengan 6 tools investigasi & verifikasi langsung, serta 
 * menerima penanam `checkpointer` dari Service Layer untuk menyimpan riwayat percakapan.
 * 
 * @param checkpointer - Instance checkpointer persis (misal: PostgresSaver)
 * @returns Instance Deep Agent yang siap dijalankan (.invoke / .stream)
 */
export async function createTriageAgent(checkpointer: Checkpointer) {
    return createDeepAgent({
        model: getChatModel(),
        tools: [
            ripgrepSearchTool,
            readRepoFileTool,
            gitLogBlameTool,
            traceDependenciesTool,
            tscNoEmitTool,
            runLinterAndTestsTool,
            submitBugReportTool,
        ],
        systemPrompt: SYSTEM_PROMPT,
        checkpointer,
    })
}