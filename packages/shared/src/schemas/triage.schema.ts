import { z } from "zod";

/**
 * Zod validation schema buat kirim message baru ke thread (Request Input)
 */
export const CreateMessageSchema = z.object({
    // saat ini maksimal karakter untuk konten adalah 10.000 karakter, dan bisa disesuaikan kedepannya
    content: z.string().min(1).max(10000),
    imageUrl: z.string().url().optional(),
    repositoryId: z.number().int().positive().optional(),
})

export type CreateMessageRequestDTO = z.infer<typeof CreateMessageSchema>

/**
 * Zod validation schema buat admin update status report dari dashboard (Request Input).
 */
export const UpdateBugReportStatusSchema = z.object({
    status: z.enum(["open", "in_progress", "resolved"]),
})

export type UpdateBugReportStatusRequestDTO = z.infer<typeof UpdateBugReportStatusSchema>

/**
 * Bentuk Response DTO publik yang dikembalikan endpoint triage ke frontend
 */
export interface ThreadResponseDTO {
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
    threadId: number
    repositoryId: number
    repositoryName?: string
    filePath: string
    lineEstimate: string | null
    reason: string
    suggestedFix: string
    status: "open" | "in_progress" | "resolved"
    createdAt: string
}