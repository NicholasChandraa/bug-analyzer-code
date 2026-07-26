import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type {
    CreateChatSessionRequestDTO,
    CreateMessageRequestDTO,
    ChatSessionResponseDTO,
    MessageResponseDTO,
} from "@restack/shared"

import { env } from "../../config/env.js";
import { triageRepo, type ChatSessionRow, type MessageRow } from "./triage.repo.js";
import { createTriageAgent } from "./triage.agent.js";

export class ChatSessionNotFoundError extends Error { }

// Mastiin chat session itu ada DAN milik userId yang lagi request - dipanggil di setiap
// endpoint yang nerima chatSessionId dari URL, biar user A gak bisa baca/nulis sesi user B.
async function assertOwnership(chatSessionId: number, userId: number): Promise<void> {
    const session = await triageRepo.getChatSessionById(chatSessionId)
    if (!session || session.userId !== userId) throw new ChatSessionNotFoundError("Chat session not found")
}

/**
 * Mengonversi objek `ChatSessionRow` (data mentah database)
 * menjadi `ChatSessionResponseDTO` (format standar JSON untuk Frontend).
 */
const toChatSessionResponseDTO = (session: ChatSessionRow): ChatSessionResponseDTO => ({
    id: session.id,
    title: session.title,
    repositoryId: session.repositoryId,
    createdAt: session.createdAt.toISOString(),
})

/**
 * Mengonversi objek `MessageRow` (data mentah database)
 * menjadi `MessageResponseDTO` (format standar JSON untuk Frontend).
 */
const toMessageResponseDTO = (message: MessageRow): MessageResponseDTO => ({
    id: message.id,
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt.toISOString(),
})

/**
 * Checkpointer PostgreSQL untuk menyimpan status percakapan (state) 
 * dan riwayat eksekusi Triage AI Agent secara persisten di database.
 */
const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL)

/**
 * Cache Singleton untuk menyimpan instance `TriageAgent` (diinisialisasi secara lazy).
 * ReturnType -> untuk mengambil tipe data yang dikembalikan oleh suatu fungsi
 */
let agentPromise: ReturnType<typeof createTriageAgent> | null = null

// Lazily builds & caches the agent - checkpointer setup() creates/verifies LangGraph's
// own Postgres tables, cukup dipanggil sekali per lifetime proses.
function getTriageAgent() {
    // Langkah A: Cek apakah agen sudah pernah di-setup & dibuat sebelumnya?
    if (!agentPromise) {
        // Langkah B: Jika BELUM (pertama kali aplikasi jalan), jalankan setup() DAHULU
        agentPromise = checkpointer.setup().then(() => createTriageAgent(checkpointer))
    }
    // Langkah C: Kembalikan Promise agen yang sudah siap
    return agentPromise
}

/**
 * Service layer untuk Triage domain.
 * Semi-DDD rules: hanya bisnis logic
 */
export const triageService = {
    createChatSession: async (userId: number, data: CreateChatSessionRequestDTO): Promise<ChatSessionResponseDTO> => {
        const session = await triageRepo.createChatSession(userId, data.title, data.repositoryId)
        return toChatSessionResponseDTO(session)
    },

    async listChatSessions(userId: number): Promise<ChatSessionResponseDTO[]> {
        const sessions = await triageRepo.listChatSessionsByUser(userId)
        // First class function dan point free style 
        // mirip kaya sessions.map((session) => toChatSessionResponseDTO(session))
        return sessions.map(toChatSessionResponseDTO)
    },

    listMessages: async (chatSessionId: number, userId: number): Promise<MessageResponseDTO[]> => {
        await assertOwnership(chatSessionId, userId)
        const messages = await triageRepo.listMessagesByChatSession(chatSessionId)
        return messages.map(toMessageResponseDTO)
    },

    // Nyimpen message user, lalu invoke deep agent - `thread_id` = chatSessionId biar
    // checkpointer nyambungin state percakapan per sesi. Return raw LangGraph stream;
    // triage.routes.ts yang nanti nge-shape jadi SSE events.
    async sendMessage(chatSessionId: number, userId: number, data: CreateMessageRequestDTO) {
        await assertOwnership(chatSessionId, userId)

        await triageRepo.addMessage({
            chatSessionId,
            role: "user",
            content: data.content,
            imageUrl: data.imageUrl ?? null,
        })

        const agent = await getTriageAgent()
        const config = { configurable: { thread_id: String(chatSessionId) } }

        // Checkpointer nyimpen riwayat lintas request - jadi buat sesi yang UDAH pernah
        // ada pesan sebelumnya, chunk PERTAMA dari stream ini bakal langsung berisi seluruh
        // riwayat lama (bukan cuma yang baru). baselineMessageCount dipakai triage.routes.ts
        // biar gak nge-replay ulang pesan lama sebagai "message_delta" baru.
        // Cast manual - tipe generic bawaan deepagents buat getState() susah di-infer lewat
        // `Checkpointer` yang cuma diekstrak structural dari Parameters<typeof createDeepAgent>.
        const priorState = (await agent.getState(config)) as { values: { messages?: unknown[] } }
        const baselineMessageCount = priorState.values.messages?.length ?? 0

        // Stream ini cuma boleh di-consume SEKALI (async generator LangGraph, gak bisa di-replay) -
        // makanya langsung di-return apa adanya ke triage.routes.ts, jangan di-loop/di-consume disini.
        const stream = await agent.stream(
            { messages: [{ role: "user", content: data.content }] },
            config
        )

        return { stream, baselineMessageCount }
    },

    // Nyimpen balasan akhir assistant sebagai riwayat chat biasa (buat ditampilin di history).
    // Data terstruktur bug report-nya (file, root cause, diff) disimpan terpisah oleh agent sendiri
    // lewat tool submit_bug_report - dua hal ini sengaja dipisah karena tujuannya beda.
    saveAssistantMessage: async (chatSessionId: number, content: string): Promise<void> => {
        if (!content) return
        await triageRepo.addMessage({ chatSessionId, role: "assistant", content, imageUrl: null })
    },
}