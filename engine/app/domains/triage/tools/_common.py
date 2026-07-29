"""Shared helpers buat semua tool - repo resolve & path guard."""

import logging

from app.infra import backend_client
from app.infra.schemas import RepositoryDTO
from app.infra.security.path_guard import validate_path_boundary

logger = logging.getLogger(__name__)


async def resolve_repo(slug: str) -> RepositoryDTO:
    """Resolve repo slug → RepositoryDTO via Backend. Throw kalau slug gak terdaftar."""
    logger.debug("resolving repo slug=%s", slug)
    repo = await backend_client.resolve_repository_by_slug(slug)
    if repo is None:
        raise ValueError(f'Repository dengan slug "{slug}" belum terdaftar')
    logger.debug("resolved repo slug=%s id=%s local_path=%s", slug, repo.id, repo.local_path)
    return repo


async def resolve_repo_path(slug: str) -> str:
    """Resolve repo slug, return localPath saja."""
    return (await resolve_repo(slug)).local_path


async def resolve_repos(slugs: list[str] | None = None) -> list[RepositoryDTO]:
    """List repo. Kalau slugs kosong/None, return semua repo terdaftar."""
    logger.debug("listing repos, slugs=%s", slugs)
    repos = await backend_client.list_repositories(slugs)
    logger.debug("listed repos count=%s", len(repos))
    return repos


def resolve_safe_path(local_path: str, file_path: str) -> str:
    """Guard path traversal - file_path harus tetep di dalam local_path."""
    logger.debug("validating path boundary: local_path=%s file_path=%s", local_path, file_path)
    return validate_path_boundary(file_path, local_path)