"use client"

import React, { useState } from "react"
import { useRepositories } from "../hooks/use-repositories"
import { FolderExplorerDialog } from "./folder-explorer-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { RefreshCw, Plus, Trash2, GitBranch, FolderGit2, CheckCircle2, AlertCircle, FolderSearch, Laptop, Globe } from "lucide-react"
import type { RepositorySourceType } from "@restack/shared"

export function RepoManager() {
  const {
    repositories,
    loading,
    syncing,
    error,
    registerRepository,
    deleteRepository,
    syncCodebase,
  } = useRepositories()

  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [sourceType, setSourceType] = useState<RepositorySourceType>("local")
  const [repoUrl, setRepoUrl] = useState("")
  const [localPath, setLocalPath] = useState("")
  const [defaultBranch, setDefaultBranch] = useState("main")
  const [formError, setFormError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isFolderExplorerOpen, setIsFolderExplorerOpen] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setActionSuccess(null)

    try {
      await registerRepository({
        name,
        slug,
        sourceType,
        repoUrl: sourceType === "remote" ? repoUrl : repoUrl || "",
        localPath,
        defaultBranch: defaultBranch || "main",
      })
      setName("")
      setSlug("")
      setRepoUrl("")
      setLocalPath("")
      setDefaultBranch("main")
      setIsAdding(false)
      setActionSuccess("Repositori berhasil didaftarkan!")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mendaftarkan repo")
    }
  }

  const handleSyncAll = async () => {
    setActionSuccess(null)
    try {
      await syncCodebase()
      setActionSuccess("Codebase & Environment berhasil diperbarui!")
    } catch {
      // error state handled by hook
    }
  }

  const handleSyncOne = async (id: number, repoName: string) => {
    setActionSuccess(null)
    try {
      await syncCodebase(id)
      setActionSuccess(`Codebase ${repoName} berhasil diperbarui!`)
    } catch {
      // error state handled by hook
    }
  }

  const handleDelete = async (id: number, repoName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus registrasi ${repoName}?`)) return
    setActionSuccess(null)
    try {
      await deleteRepository(id)
      setActionSuccess(`Repositori ${repoName} berhasil dihapus.`)
    } catch {
      // error state handled by hook
    }
  }

  const handleSelectFolderFromExplorer = (selectedPath: string) => {
    setLocalPath(selectedPath)

    // Extract folder name from path for auto-suggesting repo name & slug
    const parts = selectedPath.split("/").filter(Boolean)
    const folderName = parts[parts.length - 1]
    if (folderName) {
      if (!name) setName(folderName)
      if (!slug) setSlug(folderName.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Repositori</h2>
          <p className="text-muted-foreground text-sm">
            Daftarkan dan perbarui repositori target (Local PC atau Remote GitHub) untuk analisis bug oleh Triage Agent.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing || repositories.length === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Memperbarui..." : "Update Semua Codebase"}
          </Button>
          <Button onClick={() => setIsAdding(!isAdding)}>
            <Plus className="w-4 h-4 mr-2" />
            {isAdding ? "Batal" : "Tambah Repo"}
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-md text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isAdding && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Registrasi Repositori Baru</CardTitle>
            <CardDescription>
              Pilih mode penyimpanan repositori: folder PC lokal langsung atau remote GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {formError && (
                <p className="text-xs text-destructive font-medium">{formError}</p>
              )}

              {/* Source Type Selector */}
              <div className="space-y-1.5">
                <Label>Mode Sumber Repositori</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSourceType("local")}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${sourceType === "local"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-input hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Laptop className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">💻 Local PC Folder</div>
                      <div className="text-xs text-muted-foreground">
                        Langsung dari path PC lokal. Eksekusi cepat di host, tanpa clone/Docker Sandbox.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType("remote")}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${sourceType === "remote"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-input hover:bg-muted text-muted-foreground"
                      }`}
                  >
                    <Globe className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">🌐 Remote GitHub Repo</div>
                      <div className="text-xs text-muted-foreground">
                        Menggunakan Git Remote URL, di-clone otomatis & diuji di Docker Sandbox terisolasi.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="localPath">
                    Path Folder Projek {sourceType === "local" ? "di PC Lokal" : "Tempat Simpan Server"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="localPath"
                      placeholder={
                        sourceType === "local"
                          ? "N:/FILE-PC/NICHO/projek-saya"
                          : "./repos/frontend-app"
                      }
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFolderExplorerOpen(true)}
                      className="shrink-0"
                    >
                      <FolderSearch className="w-4 h-4 mr-1.5" />
                      Browse Folder Server
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Nama Repositori</Label>
                  <Input
                    id="name"
                    placeholder="Contoh: Frontend App"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug (Unik)</Label>
                  <Input
                    id="slug"
                    placeholder="frontend-app"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>

                {sourceType === "remote" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="repoUrl">Git Remote URL (GitHub/GitLab)</Label>
                    <Input
                      id="repoUrl"
                      placeholder="https://github.com/org/repo.git"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required={sourceType === "remote"}
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="defaultBranch">Default Branch</Label>
                  <Input
                    id="defaultBranch"
                    placeholder="main"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan Repositori</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <FolderExplorerDialog
        isOpen={isFolderExplorerOpen}
        onClose={() => setIsFolderExplorerOpen(false)}
        onSelectFolder={handleSelectFolderFromExplorer}
        initialPath={localPath}
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Memuat daftar repositori...
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FolderGit2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold">Belum Ada Repositori</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Klik tombol &quot;Tambah Repo&quot; untuk mendaftarkan repositori git pertama Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repositories.map((repo) => (
            <Card key={repo.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {repo.name}
                      <Badge variant="outline" className="text-xs">
                        {repo.slug}
                      </Badge>
                      {repo.sourceType === "local" ? (
                        <Badge variant="info" className="text-[10px] uppercase">
                          <Laptop className="w-3 h-3 mr-1" /> LOCAL PC
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          <Globe className="w-3 h-3 mr-1" /> REMOTE GIT
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 truncate max-w-[280px]">
                      {repo.repoUrl || repo.localPath}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(repo.id, repo.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground border-t pt-2">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5" /> {repo.defaultBranch}
                  </span>
                  <span className="truncate max-w-[200px]" title={repo.localPath}>
                    Path: <code className="bg-muted px-1 py-0.5 rounded">{repo.localPath}</code>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    Terakhir di-check:{" "}
                    <strong className="text-foreground">
                      {repo.lastSyncedAt
                        ? new Date(repo.lastSyncedAt).toLocaleString("id-ID")
                        : "Belum Pernah"}
                    </strong>
                  </span>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleSyncOne(repo.id, repo.name)}
                    disabled={syncing}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                    Check Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
