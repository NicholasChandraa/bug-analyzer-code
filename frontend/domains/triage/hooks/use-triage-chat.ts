"use client";

import { useState, useEffect, useCallback } from "react";
import { triageService } from "../services/triage.service";
import type {
  ChatSessionResponseDTO,
  MessageResponseDTO,
} from "@restack/shared";

export interface TodoItem {
  id: string;
  text?: string;
  title?: string;
  status: "todo" | "pending" | "in_progress" | "completed" | "done";
}

export function useTriageChat(initialSessionId?: number | null) {
  const [sessions, setSessions] = useState<ChatSessionResponseDTO[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    initialSessionId ?? null,
  );
  const [messages, setMessages] = useState<MessageResponseDTO[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await triageService.listChatSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load chat sessions",
      );
    } finally {
      setLoadingSessions(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    let isMounted = true;
    triageService
      .listChatSessions()
      .then((data) => {
        if (isMounted) {
          setSessions(data);
          if (data.length > 0 && !activeSessionId) {
            setActiveSessionId(data[0].id);
          }
          setLoadingSessions(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load chat sessions",
          );
          setLoadingSessions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSessionId]);

  const loadSessionMessages = useCallback(async (sessionId: number) => {
    try {
      setLoadingMessages(true);
      setError(null);
      setTodos([]);
      const data = await triageService.listMessages(sessionId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (activeSessionId) {
      triageService
        .listMessages(activeSessionId)
        .then((data) => {
          if (isMounted) {
            setMessages(data);
            setError(null);
            setTodos([]);
            setLoadingMessages(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(
              err instanceof Error ? err.message : "Failed to load messages",
            );
            setLoadingMessages(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeSessionId]);

  const selectSession = (sessionId: number | null) => {
    setActiveSessionId(sessionId);
    if (!sessionId) {
      setMessages([]);
      setTodos([]);
    }
  };

  const createNewSession = async (
    title: string,
    repositoryId?: number | null,
  ) => {
    try {
      setError(null);
      const newSession = await triageService.createChatSession({
        title,
        repositoryId: repositoryId ?? undefined,
      });
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setTodos([]);
      return newSession;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create chat session";
      setError(msg);
      throw err;
    }
  };

  const sendMessage = async (
    content: string,
    imageUrl?: string,
    repositoryId?: number,
  ) => {
    if (!content.trim()) return;

    let sessionId = activeSessionId;

    if (!sessionId) {
      const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
      const session = await createNewSession(title, repositoryId);
      sessionId = session.id;
    }

    const tempUserMessage: MessageResponseDTO = {
      id: Date.now(),
      role: "user",
      content,
      imageUrl: imageUrl ?? null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    const tempAssistantMessageId = Date.now() + 1;
    const tempAssistantMessage: MessageResponseDTO = {
      id: tempAssistantMessageId,
      role: "assistant",
      content: "",
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAssistantMessage]);

    setIsStreaming(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${baseUrl}/api/triage/chat-sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content,
            imageUrl: imageUrl || undefined,
            repositoryId: repositoryId || undefined,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response stream body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.replace("event: ", "").trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const dataObj = JSON.parse(dataStr);

              if (currentEvent === "todos_updated") {
                if (Array.isArray(dataObj)) {
                  setTodos(dataObj);
                } else if (typeof dataObj === "object") {
                  setTodos((prev) => [...prev, dataObj]);
                }
              } else if (currentEvent === "message_delta") {
                if (dataObj.content) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempAssistantMessageId
                        ? { ...msg, content: dataObj.content }
                        : msg,
                    ),
                  );
                }
              } else if (currentEvent === "completed") {
                setIsStreaming(false);
              } else if (currentEvent === "error") {
                const errMsg =
                  dataObj.message ||
                  "An error occurred during triage processing";
                setError(errMsg);
                // Kalau agent belum ngomong apa-apa pas error, hapus placeholder kosong.
                // Kalau udah ada content parsial, biarkan (user bisa lihat progress sebelum error).
                setMessages((prev) => {
                  const placeholder = prev.find(
                    (m) => m.id === tempAssistantMessageId,
                  );
                  if (placeholder && !placeholder.content) {
                    return prev.filter((m) => m.id !== tempAssistantMessageId);
                  }
                  return prev;
                });
                setIsStreaming(false);
              }
            } catch {
              // Ignore invalid JSON parsing errors
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempAssistantMessageId),
      );
    } finally {
      setIsStreaming(false);
      if (sessionId) {
        loadSessionMessages(sessionId);
      }
    }
  };

  return {
    sessions,
    activeSessionId,
    setActiveSessionId: selectSession,
    messages,
    todos,
    loadingSessions,
    loadingMessages,
    isStreaming,
    error,
    createNewSession,
    sendMessage,
    refreshSessions: fetchSessions,
  };
}
