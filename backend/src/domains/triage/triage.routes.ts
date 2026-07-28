import { Hono } from "hono";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import {
  CreateChatSessionSchema,
  CreateMessageSchema,
  SubmitBugReportInternalSchema,
} from "@restack/shared";
import { requireAuth } from "../../infra/middlewares/require-auth.js";
import { triageService, ChatSessionNotFoundError } from "./triage.service.js";
import { logger, type AppVariables } from "../../utils/logger.js";

/**
 * Routing layer for the Triage domain
 * Semi-DDD rules: HTTP endpoints, input validation, dan SSE event shaping only
 * business logic (agent invocation, persistence) didelegasikan ke triage.service.ts.
 */
const handleError = (
  c: Context<{ Variables: AppVariables }>,
  e: unknown,
  action: string,
) => {
  if (e instanceof ChatSessionNotFoundError)
    return c.json({ error: e.message }, 404);

  // Error dari Engine (502/503/sentuh service yang down) - pesannya udah user-friendly
  // dari triage.service.ts, forward apa adanya supaya frontend bisa tampilkan ke user.
  if (e instanceof Error && e.message.startsWith("Layanan AI")) {
    return c.json({ error: e.message }, 502);
  }

  const reqLogger = c.get("logger") || logger;
  reqLogger.error({ err: e instanceof Error ? e.message : String(e) }, action);
  return c.json({ error: "Internal server error" }, 500);
};

export const triageRoutes = new Hono<{ Variables: AppVariables }>()
  .post(
    "/chat-sessions",
    requireAuth,
    zValidator("json", CreateChatSessionSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) return c.json({ error: "Unauthorized " }, 401);

      try {
        const body = c.req.valid("json");
        const session = await triageService.createChatSession(
          Number(user.sub),
          body,
        );
        return c.json({ session });
      } catch (error) {
        return handleError(c, error, "Create chat session failed");
      }
    },
  )
  .get("/chat-sessions", requireAuth, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const sessions = await triageService.listChatSessions(Number(user.sub));
      return c.json({ sessions });
    } catch (e) {
      return handleError(c, e, "List chat sessions failed");
    }
  })
  .get("/chat-sessions/:id/messages", requireAuth, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const chatSessionId = Number(c.req.param("id"));
    if (Number.isNaN(chatSessionId))
      return c.json({ error: "Invalid chat session id" }, 400);

    try {
      const messages = await triageService.listMessages(
        chatSessionId,
        Number(user.sub),
      );
      return c.json({ messages });
    } catch (e) {
      return handleError(c, e, "List messages failed");
    }
  })
  .get("/bug-reports", requireAuth, async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const bugReports = await triageService.listBugReports();
      return c.json({ bugReports });
    } catch (e) {
      return handleError(c, e, "List bug reports failed");
    }
  })

  // Endpoint internal buat Engine (Python) - tool submit_bug_report manggil ini. SENGAJA gak
  // di-requireAuth, Engine gak pernah pegang JWT user. Operational: jangan expose ke internet
  // publik (firewall/reverse-proxy allowlist pas deploy) - lihat DEVELOPMENT.md.
  .post(
    "/internal/bug-reports",
    zValidator("json", SubmitBugReportInternalSchema),
    async (c) => {
      try {
        const result = await triageService.submitBugReportInternal(
          c.req.valid("json"),
        );
        return c.json(result, 201);
      } catch (e) {
        return handleError(c, e, "Internal submit bug report failed");
      }
    },
  )

  // Middleware zValidator ini yang bertugas mengecek apakah request berupa JSON dan apakah isinya cocok dengan CreateMessageSchema.
  .post(
    "/chat-sessions/:id/messages",
    requireAuth,
    zValidator("json", CreateMessageSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const chatSessionId = Number(c.req.param("id"));
      if (Number.isNaN(chatSessionId))
        return c.json({ error: "Invalid chat session id" }, 400);

      // mengambil objek data json yang sudah lolos dari zValidator
      const body = c.req.valid("json");

      /**
       * logger disini sebagai fallback, artinya || bertugas untuk melempat ke logger apabila tidak ada c.get("logger")
       *
       * Di framework Hono, c adalah objek Context.
       * c.get("logger") mencoba mengambil logger khusus yang sudah ditempeli oleh middleware di mana logger tersebut biasanya membawa requestId unik untuk request HTTP yang sedang berjalan ini.
       * Dengan begitu, jika terjadi error, log akan mencantumkan ID request tersebut sehingga sangat mudah dilacak di log server.
       */
      const reqLogger = c.get("logger") || logger;

      /**
       * sendMessage sekarang return ReadableStream<Uint8Array> NDJSON dari Engine (Python),
       * bukan LangGraph stream lagi. Backend jadi pure relay - gak perlu ngerti state LangGraph.
       */
      let engineStream: ReadableStream<Uint8Array>;
      try {
        const result = await triageService.sendMessage(
          chatSessionId,
          Number(user.sub),
          body,
        );
        engineStream = result.engineStream;
      } catch (e) {
        return handleError(c, e, "Send message failed");
      }

      return streamSSE(c, async (stream) => {
        const reader = engineStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Parse NDJSON line-by-line (Engine kirim newline-delimited JSON).
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;

              const { event, data } = JSON.parse(line) as {
                event: string;
                data: unknown;
              };

              // completed event: Engine kirim {chatSessionId, content} - Backend
              // simpan content sebagai assistant message, lalu forward stripped
              // {chatSessionId} only supaya frontend-facing SSE format gak berubah.
              if (event === "completed") {
                const payload = data as {
                  chatSessionId: number;
                  content?: string;
                };
                await triageService.saveAssistantMessage(
                  chatSessionId,
                  payload.content ?? "",
                );
                await stream.writeSSE({
                  event: "completed",
                  data: JSON.stringify({ chatSessionId }),
                });
                continue;
              }

              // todos_updated / message_delta / error: forward verbatim.
              await stream.writeSSE({ event, data: JSON.stringify(data) });
            }
          }
        } catch (error) {
          reqLogger.error(
            { err: error instanceof Error ? error.message : String(error) },
            "Engine stream relay failed",
          );
          // Stream dari Engine putus di tengah - frontend udah mulai nerima event,
          // jadi kirim error event lewat SSE (bukan HTTP 500) biar UI bisa tampilkan.
          const reason =
            error instanceof Error && error.message
              ? error.message
              : "Koneksi ke layanan AI terputus di tengah pemrosesan.";
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ message: reason }),
          });
        }
      });
    },
  );
