import type {
    CreateChatSessionRequestDTO,
    CreateMessageRequestDTO,
    ChatSessionResponseDTO,
    MessageResponseDTO,
    BugReportResponseDTO,
    SubmitBugReportInternalRequestDTO,
} from "@restack/shared"

import { env } from "../../config/env.js";
import { triageRepo, type ChatSessionRow, type MessageRow } from "./triage.repo.js";

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

    listBugReports: async (): Promise<BugReportResponseDTO[]> => {
        const reports = await triageRepo.listBugReportsWithDetails()
        return reports.map((r) => ({
            id: r.id,
            chatSessionId: r.chatSessionId,
            repositoryId: r.repositoryId,
            repositoryName: r.repositoryName,
            filePath: r.filePath,
            lineEstimate: r.lineEstimate,
            reason: r.reason,
            suggestedFix: r.suggestedFix,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        }))
    },

    // Nyimpen message user, lalu forward ke Engine (Python) buat jalanin agent.
    // Backend gak lagi jalanin agent sendiri - cuma relay NDJSON stream dari Engine.
    // ReadableStream ini single-consume (sama kayak async generator LangGraph sebelumnya).
    async sendMessage(chatSessionId: number, userId: number, data: CreateMessageRequestDTO) {
        await assertOwnership(chatSessionId, userId)

        await triageRepo.addMessage({
            chatSessionId,
            role: "user",
            content: data.content,
            imageUrl: data.imageUrl ?? null,
        })

        const res = await fetch(`${env.ENGINE_URL}/agent/invoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatSessionId, content: data.content }),
        })
        if (!res.ok || !res.body) {
            // Kasih pesan yang user-friendly - frontend tampilkan ini langsung ke user.
            const reason = res.status === 502 || res.status === 503
                ? "Layanan AI (Engine) sedang tidak tersedia. Coba lagi sebentar lagi."
                : `Engine invoke failed: HTTP ${res.status}`
            throw new Error(reason)
        }

        // res.body adalah ReadableStream<Uint8Array> berisi NDJSON lines dari Engine.
        // triage.routes.ts yang nge-parse & relay ke SSE - Backend gak perlu ngerti LangGraph state.
        return { engineStream: res.body }
    },

    // Nyimpen balasan akhir assistant sebagai riwayat chat biasa (buat ditampilin di history).
    // Data terstruktur bug report-nya (file, root cause, diff) disimpan terpisah oleh agent sendiri
    // lewat tool submit_bug_report - dua hal ini sengaja dipisah karena tujuannya beda.
    saveAssistantMessage: async (chatSessionId: number, content: string): Promise<void> => {
        if (!content) return
        await triageRepo.addMessage({ chatSessionId, role: "assistant", content, imageUrl: null })
    },

    // Endpoint internal buat Engine (Python) - tool submit_bug_report manggil ini lewat HTTP,
    // bukan tulis ke tabel bug_reports langsung (Engine gak pernah nyentuh tabel Drizzle).
    submitBugReportInternal: async (data: SubmitBugReportInternalRequestDTO): Promise<{ bugReportId: number }> => {
        const report = await triageRepo.createdBugReport({
            chatSessionId: data.chatSessionId,
            repositoryId: data.repositoryId,
            filePath: data.filePath,
            lineEstimate: data.lineEstimate ?? null,
            reason: data.reason,
            suggestedFix: data.suggestedFix,
        })
        return { bugReportId: report.id }
    },
}