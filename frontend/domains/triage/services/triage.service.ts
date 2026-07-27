import { client, unwrap } from "@/lib/api-client"
import type {
  CreateChatSessionRequestDTO,
  ChatSessionResponseDTO,
  MessageResponseDTO,
  BugReportResponseDTO,
} from "@restack/shared"

export const triageService = {
  createChatSession: async (
    data: CreateChatSessionRequestDTO
  ): Promise<ChatSessionResponseDTO> => {
    const res = await unwrap<{ session: ChatSessionResponseDTO }>(
      client.api.triage["chat-sessions"].$post({ json: data })
    )
    return res.session
  },

  listChatSessions: async (): Promise<ChatSessionResponseDTO[]> => {
    const res = await unwrap<{ sessions: ChatSessionResponseDTO[] }>(
      client.api.triage["chat-sessions"].$get()
    )
    return res.sessions
  },

  listMessages: async (
    chatSessionId: number
  ): Promise<MessageResponseDTO[]> => {
    const res = await unwrap<{ messages: MessageResponseDTO[] }>(
      client.api.triage["chat-sessions"][":id"].messages.$get({
        param: { id: String(chatSessionId) },
      })
    )
    return res.messages
  },

  listBugReports: async (): Promise<BugReportResponseDTO[]> => {
    const res = await unwrap<{ bugReports: BugReportResponseDTO[] }>(
      client.api.triage["bug-reports"].$get()
    )
    return res.bugReports
  },
}
