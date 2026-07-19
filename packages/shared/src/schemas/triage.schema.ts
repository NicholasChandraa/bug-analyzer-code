import { z } from "zod";

/**
 * Zod validation schema buat kirim schema baru ke thread
 */
export const CreateMessageSchema = z.object({
    // saat ini maksimal karakter untuk konten adalah 10.000 karakter, dan bisa disesuaikan kedepannya
    content: z.string().min(1).max(10000),
    imageUrl: z.url().optional(),
})

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>

/**
 * Zod validation schema buat admin update status report dari dashboard.
 */
export const UpdateBugReportStatusSchema = z.object({
    status: z.enum(["open", "in_progress", "resolved"]),
})

export type UpdateBugReportStatusInput = z.infer<typeof UpdateBugReportStatusSchema>

/**
 * Bentuk publik yang dikembalikan endpoint triage ke frontend
 */
export interface ThreadSummary {
    id: number
    title: string
    createdAt: string
}

export interface MessageDTO {
    id: number
    role: "user" | "assistant"
    content: string
    imageUrl: string | null
    createdAt: string
}

export interface BugReportDTO {
    id: number
    threadId: number
    filePath: string
    lineEstimate: string | null
    reason: string
    suggestedFix: string
    status: "open" | "in_progress" | "resolved"
    createdAt: string
}