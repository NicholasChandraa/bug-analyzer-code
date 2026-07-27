"""1:1 port dari backend/src/infra/security/path-guard.ts (`validatePathBoundary`)."""

import os


class PathBoundaryError(Exception):
    pass


def validate_path_boundary(target_path: str, allowed_repo_local_path: str) -> str:
    """Mastiin target_path tetep di dalam allowed_repo_local_path. Perbandingan-nya SENGAJA
    case-insensitive & forward-slash-normalized di kedua platform (bukan cuma di Windows) -
    persis kayak versi TS-nya, jangan "dibenerin" jadi case-sensitive di Linux."""
    absolute_allowed = os.path.abspath(allowed_repo_local_path)
    absolute_target = (
        os.path.abspath(target_path)
        if os.path.isabs(target_path)
        else os.path.abspath(os.path.join(absolute_allowed, target_path))
    )

    normalized_allowed = absolute_allowed.replace("\\", "/").lower()
    normalized_target = absolute_target.replace("\\", "/").lower()
    allowed_prefix = normalized_allowed if normalized_allowed.endswith("/") else f"{normalized_allowed}/"

    if normalized_target != normalized_allowed and not normalized_target.startswith(allowed_prefix):
        raise PathBoundaryError(
            f'Access denied: Target path "{target_path}" is outside the allowed repository '
            f'boundary "{allowed_repo_local_path}"'
        )

    return absolute_target  # case asli tetap dipertahankan - cuma perbandingannya yang di-lowercase
