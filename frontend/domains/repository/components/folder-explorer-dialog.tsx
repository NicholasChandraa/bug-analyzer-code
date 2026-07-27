"use client"

import React, { useState, useEffect, useCallback } from "react"
import { repositoryService } from "../services/repository.service"
import type { BrowseDirectoriesResponseDTO } from "@restack/shared"
import { Button } from "@/components/ui/button"
import { Folder, FolderTree, ArrowUp, Check, Loader2, AlertCircle, X } from "lucide-react"

interface FolderExplorerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectFolder: (selectedPath: string) => void
  initialPath?: string
}

export function FolderExplorerDialog({
  isOpen,
  onClose,
  onSelectFolder,
  initialPath,
}: FolderExplorerDialogProps) {
  const [data, setData] = useState<BrowseDirectoriesResponseDTO | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentBrowsingPath, setCurrentBrowsingPath] = useState<string>(
    initialPath || ""
  )

  const fetchDirectories = useCallback((targetPath?: string) => {
    setLoading(true)
    setError(null)
    repositoryService
      .browseDirectories(targetPath)
      .then((res) => {
        setData(res)
        setCurrentBrowsingPath(res.currentPath)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Gagal membaca direktori")
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let isMounted = true

    if (isOpen) {
      repositoryService
        .browseDirectories(currentBrowsingPath || undefined)
        .then((res) => {
          if (isMounted) {
            setData(res)
            setCurrentBrowsingPath(res.currentPath)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : "Gagal membaca direktori")
            setLoading(false)
          }
        })
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, currentBrowsingPath])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base">Browse Direktori Server</h3>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Path Navigation Bar */}
        <div className="p-3 border-b bg-muted/30 flex items-center gap-2 text-xs">
          <Button
            size="xs"
            variant="outline"
            disabled={!data?.parentPath || loading}
            onClick={() => data?.parentPath && fetchDirectories(data.parentPath)}
            title="Ke Folder Induk"
          >
            <ArrowUp className="w-3.5 h-3.5 mr-1" /> Up
          </Button>
          <div className="flex-1 bg-background border px-2.5 py-1 rounded font-mono truncate">
            {data?.currentPath || "Loading..."}
          </div>
        </div>

        {/* Directory List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[250px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Membaca struktur folder...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data?.directories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Tidak ada subfolder di dalam direktori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data?.directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => fetchDirectories(dir.path)}
                  className="flex items-center gap-2.5 p-2 rounded-lg border bg-background hover:bg-primary/5 hover:border-primary/50 text-xs transition-colors text-left group"
                >
                  <Folder className="w-4 h-4 text-amber-500 group-hover:text-primary shrink-0 transition-colors" />
                  <span className="truncate font-medium">{dir.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground truncate">
            Klik folder untuk navigasi masuk.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!data?.currentPath || loading}
              onClick={() => {
                if (data?.currentPath) {
                  onSelectFolder(data.currentPath)
                  onClose()
                }
              }}
            >
              <Check className="w-4 h-4 mr-1" /> Pilih Folder Ini
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
