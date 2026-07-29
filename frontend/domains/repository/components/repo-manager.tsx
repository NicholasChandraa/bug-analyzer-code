"use client";

import React, { useState } from "react";
import { useRepositories } from "../hooks/use-repositories";
import { FolderExplorerDialog } from "./folder-explorer-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  RefreshCw,
  Plus,
  Trash2,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  FolderSearch,
  Laptop,
} from "lucide-react";

export function RepoManager() {
  const {
    repositories,
    loading,
    syncing,
    error,
    registerRepository,
    deleteRepository,
    syncCodebase,
  } = useRepositories();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isFolderExplorerOpen, setIsFolderExplorerOpen] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionSuccess(null);

    try {
      await registerRepository({
        name,
        slug,
        localPath,
      });
      setName("");
      setSlug("");
      setLocalPath("");
      setIsAdding(false);
      setActionSuccess("Repositori berhasil didaftarkan!");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal mendaftarkan repo",
      );
    }
  };

  const handleSyncOne = async (id: number, repoName: string) => {
    setActionSuccess(null);
    try {
      await syncCodebase(id);
      setActionSuccess(`Status lokasi ${repoName} berhasil diperbarui!`);
    } catch {
      // error state handled by hook
    }
  };

  const handleDelete = async (id: number, repoName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus registrasi ${repoName}?`))
      return;
    setActionSuccess(null);
    try {
      await deleteRepository(id);
      setActionSuccess(`Repositori ${repoName} berhasil dihapus.`);
    } catch {
      // error state handled by hook
    }
  };

  const handleSelectFolderFromExplorer = (selectedPath: string) => {
    setLocalPath(selectedPath);

    // Extract folder name from path for auto-suggesting repo name & slug
    const parts = selectedPath.split("/").filter(Boolean);
    const folderName = parts[parts.length - 1];
    if (folderName) {
      if (!name) setName(folderName);
      if (!slug) setSlug(folderName.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Manajemen Repositori
          </h2>
          <p className="text-muted-foreground text-sm">
            Daftarkan folder repositori lokal di disk untuk diakses oleh Triage Agent.
          </p>
        </div>
        <div>
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
            <CardTitle className="text-lg">
              Registrasi Repositori Baru
            </CardTitle>
            <CardDescription>
              Pilih folder repositori lokal di disk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {formError && (
                <p className="text-xs text-destructive font-medium">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="localPath">
                    Path Folder Projek di PC Lokal
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="localPath"
                      placeholder="N:/FILE-PC/NICHO/projek-saya"
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
                      Browse Folder
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
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdding(false)}
                >
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
            Klik tombol &quot;Tambah Repo&quot; untuk mendaftarkan repositori
            pertama Anda.
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
                      <Badge variant="info" className="text-[10px] uppercase">
                        <Laptop className="w-3 h-3 mr-1" /> LOCAL
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 truncate max-w-[280px]">
                      {repo.localPath}
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
                  <span
                    className="truncate max-w-[200px]"
                    title={repo.localPath}
                  >
                    Path:{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {repo.localPath}
                    </code>
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
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`}
                    />
                    Check Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
