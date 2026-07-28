"""Repo resolver - satu choke point buat resolve repo slug → RepositoryDTO via Backend.

Dipisah dari tools.py supaya:
1. Testable - tools terima instance ini, gak import backend_client langsung, gampang mock.
2. Cacheable - kalau nanti mau cache resolve (repo gak sering berubah mid-turn), tinggal tambah di sini.
3. Konsisten - 3 helper hampir sama (_resolve_repo/_resolve_repo_path/_resolve_repo_paths) jadi 1 class.
"""

import logging

from app.domains.triage.schemas import RepositoryDTO
from app.infra import backend_client

logger = logging.getLogger(__name__)


class RepoResolver:
    """Resolve repo slug ke RepositoryDTO lewat Backend internal endpoints.

    Tools terima instance ini (bukan import backend_client langsung) - pattern dependency
    injection yang deepagents/langchain pakai internal (mirip ToolRuntime injection).
    """

    async def get(self, slug: str) -> RepositoryDTO:
        """Resolve 1 repo by slug. Throw kalau slug gak terdaftar."""
        repo = await backend_client.resolve_repository_by_slug(slug)
        if repo is None:
            raise ValueError(f'Repository dengan slug "{slug}" belum terdaftar')
        return repo

    async def get_path(self, slug: str) -> str:
        """Resolve repo, return localPath saja (shortcut buat tool yang cuma butuh path)."""
        return (await self.get(slug)).local_path

    async def list(self, slugs: list[str] | None = None) -> list[RepositoryDTO]:
        """List repo. Kalau slugs kosong/None, return semua repo terdaftar."""
        return await backend_client.list_repositories(slugs)


# Default instance buat production - tools pakai ini kalau gak di-inject.
default_resolver = RepoResolver()