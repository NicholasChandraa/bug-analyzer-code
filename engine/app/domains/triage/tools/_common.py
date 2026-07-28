"""Shared helpers buat semua tool - repo resolve & path guard."""

from app.infra import backend_client
from app.infra.schemas import RepositoryDTO
from app.infra.security.path_guard import validate_path_boundary


async def resolve_repo(slug: str) -> RepositoryDTO:
    """Resolve repo slug → RepositoryDTO via Backend. Throw kalau slug gak terdaftar."""
    repo = await backend_client.resolve_repository_by_slug(slug)
    if repo is None:
        raise ValueError(f'Repository dengan slug "{slug}" belum terdaftar')
    return repo


async def resolve_repo_path(slug: str) -> str:
    """Resolve repo slug, return localPath saja."""
    return (await resolve_repo(slug)).local_path


async def resolve_repos(slugs: list[str] | None = None) -> list[RepositoryDTO]:
    """List repo. Kalau slugs kosong/None, return semua repo terdaftar."""
    return await backend_client.list_repositories(slugs)


def resolve_safe_path(local_path: str, file_path: str) -> str:
    """Guard path traversal - file_path harus tetep di dalam local_path."""
    return validate_path_boundary(file_path, local_path)