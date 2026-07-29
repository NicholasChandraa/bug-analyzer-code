"use client";

import React, { useState } from "react";
import { useTriageChat } from "../hooks/use-triage-chat";
import { useRepositories } from "@/domains/repository/hooks/use-repositories";
import { RepoSelector } from "@/domains/repository/components/repo-selector";
import { TodoProgress } from "./todo-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  MessageSquarePlus,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";

export function ChatInterface() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    todos,
    loadingSessions,
    loadingMessages,
    isStreaming,
    error,
    createNewSession,
    sendMessage,
  } = useTriageChat();

  const { repositories } = useRepositories();
  const [selectedRepoId, setSelectedRepoId] = useState<number | undefined>(
    undefined,
  );
  const [inputContent, setInputContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleSend = async () => {
    if (!inputContent.trim() || isStreaming) return;
    const content = inputContent;
    const img = imageUrl || undefined;
    const repoId = selectedRepoId;

    setInputContent("");
    setImageUrl(null);

    await sendMessage(content, img, repoId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* Sidebar - Sessions List */}
      <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden border">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquarePlus className="w-4 h-4 text-primary" /> Sesi Chat
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              createNewSession("New Bug Triage Session", selectedRepoId)
            }
            className="text-xs h-8"
          >
            Sesi Baru
          </Button>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
          {loadingSessions ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              Memuat sesi...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              Belum ada riwayat sesi.
            </div>
          ) : (
            sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex flex-col gap-1 ${
                  activeSessionId === sess.id
                    ? "bg-primary/10 font-semibold text-primary border border-primary/20"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="truncate text-foreground font-medium">
                  {sess.title}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(sess.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="lg:col-span-6 flex flex-col h-full overflow-hidden border">
        {/* Header Controls */}
        <div className="p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-64">
            <RepoSelector
              repositories={repositories}
              selectedRepoId={selectedRepoId ?? null}
              onSelectRepo={(id) => setSelectedRepoId(id ?? undefined)}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {isStreaming ? (
              <span className="flex items-center gap-1.5 text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing
                codebase...
              </span>
            ) : (
              <span>Agent Status: Ready</span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-md flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Stream Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat riwayat
              percakapan...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg">
                Jelaskan Bug atau Masalah Kode
              </h3>
              <p className="text-sm text-muted-foreground">
                Tulis deskripsi kendala, sertakan screenshot jika ada, lalu
                pilih repositori target. Agen akan mencari lokasi file dan
                merumuskan perbaikan kode.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-orange-500 text-white font-bold shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`space-y-2 rounded-xl p-3.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-2xs text-card-foreground"
                  }`}
                >
                  {msg.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={msg.imageUrl}
                      alt="Bug Screenshot"
                      className="max-h-60 rounded-md object-contain border bg-black/5"
                    />
                  )}
                  {msg.content ? (
                    <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking &
                      scanning codebase...
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Composer */}
        <div className="p-3 border-t bg-card space-y-3 shrink-0">
          {imageUrl && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="h-16 w-16 object-cover rounded-md border"
              />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deskripsikan bug (e.g. 'Tombol checkout 500 error di file cart.service.ts')..."
              className="min-h-[50px] max-h-[120px] text-xs resize-none"
              disabled={isStreaming}
            />
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const url = prompt("Masukkan URL gambar bug screenshot:");
                  if (url) setImageUrl(url);
                }}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={!inputContent.trim() || isStreaming}
                size="icon"
                className="h-10 w-10 shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-bold"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Right Sidebar - Agent Reasoning To-Do Panel */}
      <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden border">
        <TodoProgress todos={todos} />
      </Card>
    </div>
  );
}
