"use client"

import { useState, useEffect, useCallback } from "react"
import { repositoryService } from "../services/repository.service"
import type {
  RepositoryResponseDTO,
  CreateRepositoryRequestDTO,
  UpdateRepositoryRequestDTO,
} from "@restack/shared"

export function useRepositories() {
  const [repositories, setRepositories] = useState<RepositoryResponseDTO[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = useCallback(async () => {
    try {
      setError(null)
      const data = await repositoryService.listRepositories()
      setRepositories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repositories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    repositoryService
      .listRepositories()
      .then((data) => {
        if (isMounted) {
          setRepositories(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load repositories")
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const registerRepository = async (data: CreateRepositoryRequestDTO) => {
    try {
      setError(null)
      const newRepo = await repositoryService.registerRepository(data)
      setRepositories((prev) => [newRepo, ...prev])
      return newRepo
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register repository"
      setError(msg)
      throw err
    }
  }

  const updateRepository = async (id: number, data: UpdateRepositoryRequestDTO) => {
    try {
      setError(null)
      const updated = await repositoryService.updateRepository(id, data)
      setRepositories((prev) =>
        prev.map((repo) => (repo.id === id ? updated : repo))
      )
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update repository"
      setError(msg)
      throw err
    }
  }

  const deleteRepository = async (id: number) => {
    try {
      setError(null)
      await repositoryService.deleteRepository(id)
      setRepositories((prev) => prev.filter((repo) => repo.id !== id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete repository"
      setError(msg)
      throw err
    }
  }

  const syncCodebase = async (repositoryId?: number) => {
    try {
      setSyncing(true)
      setError(null)
      await repositoryService.syncCodebase(repositoryId)
      await fetchRepositories()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Codebase sync failed"
      setError(msg)
      throw err
    } finally {
      setSyncing(false)
    }
  }

  return {
    repositories,
    loading,
    syncing,
    error,
    refresh: fetchRepositories,
    registerRepository,
    updateRepository,
    deleteRepository,
    syncCodebase,
  }
}
