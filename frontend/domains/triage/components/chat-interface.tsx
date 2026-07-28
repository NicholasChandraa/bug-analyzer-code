"use client"

import React, { useState, useRef, useEffect } from "react"
import { useTriageChat } from "../hooks/use-triage-chat"
import { useRepositories } from "@/domains/repository/hooks/use-repositories"
import { RepoSelector } from "@/domains/repository/components/repo-selector"
import { TodoProgress } from "./todo-progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Image as ImageIcon,
  Bot,
  User,
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react"

import { useSearchParams } from "next/navigation"

export function ChatInterface() {
  const searchParams = useSearchParams()
  const urlRepoId = searchParams.get("repoId")

  const { repositories, loading: loadingRepos } = useRepositories()
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    todos,
    isStreaming,
    error,
    createNewSession,
    sendMessage,
  } = useTriageChat()

  // User explicit selection in dropdown overrides URL search param
  const [userSelectedRepoId, setUserSelectedRepoId] = useState<number | null | undefined>(undefined)
  const [inputText, setInputText] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Derived selected repo id (derived state pattern - always targets a specific repo)
  const currentSelectedRepoId =
    userSelectedRepoId !== undefined
      ? userSelectedRepoId
      : urlRepoId && !Number.isNaN(Number(urlRepoId))
      ? Number(urlRepoId)
      : repositories.length > 0
      ? repositories[0].id
      : null

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, todos, isStreaming])

  const handleNewChat = async () => {
    const defaultTitle = "Percakapan Bug Triage Baru"
    try {
      await createNewSession(defaultTitle, currentSelectedRepoId)
    } catch {
      // Handled in hook
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isStreaming) return

    const textToSend = inputText
    const imageToSend = imageUrl

    setInputText("")
    setImageUrl("")

    await sendMessage(textToSend, imageToSend, currentSelectedRepoId || undefined)
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result)
      }
      setIsUploadingImage(false)
    }
    reader.onerror = () => {
      setIsUploadingImage(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] border rounded-xl overflow-hidden bg-background">
      {/* Sidebar Chat Sessions */}
      <div className="w-64 border-r bg-muted/20 flex flex-col hidden md:flex">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-primary" /> Percakapan
          </span>
          <Button size="xs" variant="outline" onClick={handleNewChat}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Baru
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              Belum ada sesi percakapan.
            </p>
          ) : (
            sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                  sess.id === activeSessionId
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-foreground/80"
                }`}
              >
                <span className="truncate">{sess.title}</span>
                <span
                  className={`text-[10px] ${
                    sess.id === activeSessionId
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {new Date(sess.createdAt).toLocaleDateString("id-ID")}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Repo Selector */}
        <div className="p-3 border-b bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Smart Bug Triage
            </span>
            <Badge variant="secondary" className="text-xs font-normal">
              Deep Agent ReAct
            </Badge>
          </div>
          <RepoSelector
            repositories={repositories}
            selectedRepoId={currentSelectedRepoId}
            onSelectRepo={setUserSelectedRepoId}
            disabled={isStreaming || loadingRepos}
          />
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg">Jelaskan Bug atau Masalah Kode</h3>
              <p className="text-sm text-muted-foreground">
                Tulis deskripsi kendala, sertakan screenshot jika ada, lalu pilih repositori target. Agen akan mencari lokasi file dan merumuskan perbaikan kode.
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
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
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
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  ) : msg.role === "assistant" && isStreaming ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Agen sedang menganalisis repositori...</span>
                    </div>
                  ) : null}

                  {msg.role === "assistant" && idx === messages.length - 1 && (
                    <TodoProgress todos={todos} />
                  )}
                </div>
              </div>
            ))
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-3 border-t bg-card">
          {imageUrl && (
            <div className="mb-2 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                className="h-16 w-auto rounded border object-cover"
              />
              <button
                onClick={() => setImageUrl("")}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="relative flex-1">
              <Textarea
                placeholder="Deskripsikan bug (contoh: 'Endpoint /api/users mengembalikan 500 saat nama bernilai null')..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                rows={2}
                className="resize-none pr-10 text-sm"
                disabled={isStreaming}
              />
              <label
                htmlFor="image-upload"
                className="absolute right-2.5 bottom-2.5 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md transition-colors"
                title="Upload Screenshot Bug"
              >
                <ImageIcon className="w-4 h-4" />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  disabled={isStreaming || isUploadingImage}
                />
              </label>
            </div>
            <Button
              type="submit"
              disabled={isStreaming || !inputText.trim()}
              className="h-full min-h-[54px] px-4"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
