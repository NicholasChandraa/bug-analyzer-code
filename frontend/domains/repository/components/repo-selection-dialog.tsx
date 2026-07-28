"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { RepositoryResponseDTO } from "@restack/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderGit2,
  Laptop,
  ArrowRight,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";

interface RepoSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: RepositoryResponseDTO[];
}

export function RepoSelectionDialog({
  isOpen,
  onClose,
  repositories,
}: RepoSelectionDialogProps) {
  const router = useRouter();
  // Default to the first available repository
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(
    repositories.length > 0 ? repositories[0].id : null,
  );

  if (!isOpen) return null;

  // Ensure selectedRepoId updates if repositories load after mount
  const activeRepoId =
    selectedRepoId ?? (repositories.length > 0 ? repositories[0].id : null);

  const handleStartChat = () => {
    if (!activeRepoId) return;
    onClose();
    router.push(`/chat?repoId=${activeRepoId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between bg-muted/20">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Pilih Repositori
              Target
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih projek repositori spesifik tempat Anda menemukan bug untuk
              dianalisis oleh AI Agent.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body / List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {repositories.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-muted/10 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="font-medium text-sm">
                Belum Ada Repositori Terdaftar
              </div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Silakan hubungi Administrator untuk mendaftarkan repositori
                target terlebih dahulu.
              </p>
            </div>
          ) : (
            repositories.map((repo) => {
              const isSelected = activeRepoId === repo.id;
              return (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => setSelectedRepoId(repo.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {repo.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        <Laptop className="w-3 h-3 mr-1" /> LOCAL
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                      {repo.slug}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button size="sm" onClick={handleStartChat} disabled={!activeRepoId}>
            Mulai Chat Sekarang <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
