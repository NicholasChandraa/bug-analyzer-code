import { z } from "zod";

/**
 * Zod validation schema buat buat chat session baru (Request Input)
 */
export const CreateChatSessionSchema = z.object({
    title: z.string().min(1).max(200),
    repositoryId: z.number().int().positive().nullable().optional(),
})

export type CreateChatSessionRequestDTO = z.infer<typeof CreateChatSessionSchema>

/**
 * Zod validation schema buat kirim message baru ke chat session (Request Input)
 */
export const CreateMessageSchema = z.object({
    // saat ini maksimal karakter untuk konten adalah 10.000 karakter, dan bisa disesuaikan kedepannya
    content: z.string().min(1).max(10000),
    imageUrl: z.string().url().optional(),
    repositoryId: z.number().int().positive().optional(),
})

export type CreateMessageRequestDTO = z.infer<typeof CreateMessageSchema>

/**
 * Zod validation schema buat endpoint internal submit_bug_report (dipanggil Engine, bukan user).
 */
export const SubmitBugReportInternalSchema = z.object({
    chatSessionId: z.number().int().positive(),
    repositoryId: z.number().int().positive(),
    filePath: z.string().min(1),
    lineEstimate: z.string().nullable().optional(),
    reason: z.string().min(1),
    suggestedFix: z.string().min(1),
})

export type SubmitBugReportInternalRequestDTO = z.infer<typeof SubmitBugReportInternalSchema>

/**
 * Bentuk Response DTO publik yang dikembalikan endpoint triage ke frontend
 */
export interface ChatSessionResponseDTO {
    id: number
    title: string
    repositoryId: number | null
    createdAt: string
}

export interface MessageResponseDTO {
    id: number
    role: "user" | "assistant"
    content: string
    imageUrl: string | null
    createdAt: string
}

export interface BugReportResponseDTO {
    id: number
    chatSessionId: number
    repositoryId: number
    repositoryName?: string
    filePath: string
    lineEstimate: string | null
    reason: string
    suggestedFix: string
    status: "open" | "in_progress" | "resolved"
    createdAt: string
}