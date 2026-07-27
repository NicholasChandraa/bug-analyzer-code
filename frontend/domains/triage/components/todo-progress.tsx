"use client"

import React from "react"
import type { TodoItem } from "../hooks/use-triage-chat"
import { CheckCircle2, Circle, Loader2, ListChecks } from "lucide-react"

interface TodoProgressProps {
  todos: TodoItem[]
}

export function TodoProgress({ todos }: TodoProgressProps) {
  if (!todos || todos.length === 0) return null

  return (
    <div className="my-3 p-3.5 rounded-lg border bg-muted/30 dark:bg-muted/15 space-y-2.5 text-xs">
      <div className="flex items-center gap-2 font-medium text-muted-foreground border-b pb-2">
        <ListChecks className="w-4 h-4 text-primary" />
        <span>Rencana Investigasi Agen (Agent Todo List)</span>
      </div>
      <div className="space-y-1.5">
        {todos.map((item, idx) => {
          const titleText = item.text || item.title || `Task #${idx + 1}`
          const isDone = item.status === "done" || item.status === "completed"
          const isInProgress = item.status === "in_progress"

          return (
            <div
              key={item.id || idx}
              className={`flex items-start gap-2 transition-colors ${
                isDone
                  ? "text-muted-foreground line-through"
                  : isInProgress
                  ? "text-primary font-medium"
                  : "text-foreground/80"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              ) : isInProgress ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{titleText}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
