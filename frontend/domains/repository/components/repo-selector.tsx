"use client"

import React from "react"
import type { RepositoryResponseDTO } from "@restack/shared"
import { FolderGit2 } from "lucide-react"

interface RepoSelectorProps {
  repositories: RepositoryResponseDTO[]
  selectedRepoId: number | null
  onSelectRepo: (id: number | null) => void
  disabled?: boolean
}

export function RepoSelector({
  repositories,
  selectedRepoId,
  onSelectRepo,
  disabled = false,
}: RepoSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <FolderGit2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <select
        value={selectedRepoId ?? ""}
        onChange={(e) => {
          const val = e.target.value
          onSelectRepo(val ? Number(val) : null)
        }}
        disabled={disabled}
        className="h-9 w-full min-w-[200px] max-w-[320px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">-- Pilih Repositori Target --</option>
        {repositories.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.name} ({repo.slug}) — {repo.defaultBranch}
          </option>
        ))}
      </select>
    </div>
  )
}
