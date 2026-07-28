"use client";

import React from "react";
import type { RepositoryResponseDTO } from "@restack/shared";
import { FolderGit2 } from "lucide-react";

interface RepoSelectorProps {
  repositories: RepositoryResponseDTO[];
  selectedRepoId: number | null;
  onSelectRepo: (id: number | null) => void;
  disabled?: boolean;
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
        value={
          selectedRepoId ?? (repositories.length > 0 ? repositories[0].id : "")
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val) onSelectRepo(Number(val));
        }}
        disabled={disabled || repositories.length === 0}
        className="h-9 w-full min-w-[200px] max-w-[320px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-medium"
      >
        {repositories.length === 0 && (
          <option value="">-- Belum Ada Repositori --</option>
        )}
        {repositories.map((repo) => (
          <option key={repo.id} value={repo.id}>
            📁 {repo.name} ({repo.slug})
          </option>
        ))}
      </select>
    </div>
  );
}
