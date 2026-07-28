"""Shared helpers buat semua tool - repo resolve, path guard, formatting.

Dipisah dari tiap tool file supaya gak duplikasi dan gampang test. Tool terima resolver
instance (dependency injection), default ke module-level default_resolver buat production.
"""

from app.domains.triage.repo_resolver import RepoResolver, default_resolver
from app.infra.security.path_guard import validate_path_boundary


def resolve_safe_path(local_path: str, file_path: str) -> str:
    """Guard path traversal - file_path harus tetep di dalam local_path."""
    return validate_path_boundary(file_path, local_path)


def get_resolver(resolver: RepoResolver | None = None) -> RepoResolver:
    """Return resolver instance, default ke module-level singleton kalau gak di-inject."""
    return resolver or default_resolver