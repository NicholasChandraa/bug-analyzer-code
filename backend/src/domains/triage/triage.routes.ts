import { Hono } from "hono";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { CreateChatSessionSchema, CreateMessageSchema } from "@restack/shared";
import { requireAuth } from "../../infra/middlewares/require-auth.js";
import { triageService, ChatSessionNotFoundError } from "./triage.service.js";
import { logger, type AppVariables } from "../../utils/logger.js";

/**
 * Routing layer for the Triage domain
 * Semi-DDD rules: HTTP endpoints, input validation, dan SSE event shaping only
 * business logic (agent invocation, persistence) didelegasikan ke triage.service.ts.
 */
const handleError = (c: Context<{ Variables: AppVariables }>, e: unknown, action: string) => {
    if (e instanceof ChatSessionNotFoundError) return c.json({ error: e.message }, 404)

    const reqLogger = c.get("logger") || logger
    reqLogger.error({ err: e instanceof Error ? e.message : String(e) }, action)
    return c.json({ error: "Internal server error" }, 500)
}

export const triageRoutes = new Hono<{ Variables: AppVariables }>()
    .post("/chat-sessions", requireAuth, zValidator("json", CreateChatSessionSchema), async (c) => {
        const user = c.get("user")
        if (!user) return c.json({ error: "Unauthorized " }, 401)

        try {
            const body = c.req.valid("json")
            const session = await triageService.createChatSession(Number(user.sub), body)
            return c.json({ session })
        } catch (error) {
            return handleError(c, error, "Create chat session failed")
        }
    })
    .get("/chat-sessions", requireAuth, async (c) => {
        const user = c.get("user")
        if (!user) return c.json({ error: "Unauthorized" }, 401)

        try {
            const sessions = await triageService.listChatSessions(Number(user.sub))
            return c.json({ sessions })
        } catch (e) {
            return handleError(c, e, "List chat sessions failed")
        }
    })
    .get("/chat-sessions/:id/messages", requireAuth, async (c) => {
        const user = c.get("user")
        if (!user) return c.json({ error: "Unauthorized" }, 401)

        const chatSessionId = Number(c.req.param("id"))
        if (Number.isNaN(chatSessionId)) return c.json({ error: "Invalid chat session id" }, 400)

        try {
            const messages = await triageService.listMessages(chatSessionId, Number(user.sub))
            return c.json({ messages })
        } catch (e) {
            return handleError(c, e, "List messages failed")
        }
    })

    // Middleware zValidator ini yang bertugas mengecek apakah request berupa JSON dan apakah isinya cocok dengan CreateMessageSchema.
    .post("/chat-sessions/:id/messages", requireAuth, zValidator("json", CreateMessageSchema), async (c) => {
        const user = c.get("user")
        if (!user) return c.json({ error: "Unauthorized" }, 401)

        const chatSessionId = Number(c.req.param("id"))
        if (Number.isNaN(chatSessionId)) return c.json({ error: "Invalid chat session id" }, 400)

        // mengambil objek data json yang sudah lolos dari zValidator
        const body = c.req.valid("json")

        /**
         * logger disini sebagai fallback, artinya || bertugas untuk melempat ke logger apabila tidak ada c.get("logger")
         * 
         * Di framework Hono, c adalah objek Context.
         * c.get("logger") mencoba mengambil logger khusus yang sudah ditempeli oleh middleware di mana logger tersebut biasanya membawa requestId unik untuk request HTTP yang sedang berjalan ini.
         * Dengan begitu, jika terjadi error, log akan mencantumkan ID request tersebut sehingga sangat mudah dilacak di log server.
        */
        const reqLogger = c.get("logger") || logger

        /**
         * ReturnType<typeof triageService.sendMessage> Fungsi sendMessage adalah fungsi async. Tipe kembalian aslinya adalah: Promise<StreamData> (Masih terbungkus Promise).
         * Awaited< ... > TypeScript mengupas Promise-nya, sehingga tipe data hasilnya menjadi: StreamData (Data murni setelah await selesai).
         */
        let agentStream: Awaited<ReturnType<typeof triageService.sendMessage>>["stream"]
        let baselineMessageCount: number
        try {
            const result = await triageService.sendMessage(chatSessionId, Number(user.sub), body)
            agentStream = result.stream
            baselineMessageCount = result.baselineMessageCount
        } catch (e) {
            return handleError(c, e, "Send message failed")
        }

        return streamSSE(c, async (stream) => {
            let lastTodosJson = ""
            // Diseed dari jumlah pesan SEBELUM turn ini (bukan 0) - checkpointer LangGraph
            // rehydrate seluruh riwayat percakapan di chunk pertama, jadi kalau mulai dari 0
            // semua pesan lama bakal ke-anggap "baru" dan di-replay ulang lewat SSE.
            let lastMessageCount = baselineMessageCount
            let lastAiText = ""

            try {
                for await (const chunk of agentStream) {
                    console.log("Chunk:", chunk)
                    const state = chunk as { todos?: unknown; messages?: Array<{ type: string; text: string }> }

                    if (state.todos) {
                        // convert object / array ke bentuk JSON
                        const todosJson = JSON.stringify(state.todos)
                        if (todosJson !== lastTodosJson) {
                            lastTodosJson = todosJson
                            await stream.writeSSE({ event: "todos_updated", data: todosJson })
                        }
                    }

                    const messages = state.messages ?? []
                    if (messages.length > lastMessageCount) {
                        const newMessages = messages.slice(lastMessageCount)
                        lastMessageCount = messages.length

                        for (const message of newMessages) {
                            if (message.type !== "ai") continue
                            lastAiText = message.text
                            await stream.writeSSE({ event: "message_delta", data: JSON.stringify({ content: message.text }) })
                        }
                    }
                }

                // Simpan balasan akhir assistant sebagai riwayat chat (bug report-nya sendiri
                // udah disimpan agent lewat tool submit_bug_report di dalam loop di atas).
                await triageService.saveAssistantMessage(chatSessionId, lastAiText)

                await stream.writeSSE({ event: "completed", data: JSON.stringify({ chatSessionId }) })
            } catch (error) {
                reqLogger.error({ err: error instanceof Error ? error.message : String(error) }, "Triage agent stream failed")
                await stream.writeSSE({ event: "error", data: JSON.stringify({ message: "Agent failed to process the request" }) })
            }
        })
    })