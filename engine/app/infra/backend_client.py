"""HTTP client ke 2 endpoint internal Backend (resolve repo info, submit bug report).

Ini satu-satunya jalur Engine→Backend - gak pernah lebih dari 2 call ini.
Module-level httpx client dibangun di import time, ditutup di lifespan main.py.
"""

import httpx

from app.config import settings
from app.domains.triage.schemas import BugReportIdResponse, RepositoryDTO

# Retries cuma connection-level failures (refused/reset), bukan timeout/5xx - cukup buat
# 2 call site dengan Backend yang cuma briefly unavailable pas redeploy.
_client = httpx.AsyncClient(
    base_url=settings.BACKEND_URL,
    timeout=httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0),
    transport=httpx.AsyncHTTPTransport(retries=2),
)


async def resolve_repository_by_slug(slug: str) -> RepositoryDTO | None:
    """Cari 1 repo by slug. Return None kalau 404 (slug gak terdaftar)."""
    response = await _client.get(f"/api/repositories/internal/by-slug/{slug}")
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return RepositoryDTO.model_validate(response.json()["repository"])


async def list_repositories(slugs: list[str] | None = None) -> list[RepositoryDTO]:
    """List semua repo terdaftar, atau filter by slugs kalau diberikan."""
    params: dict[str, str] | None = None
    if slugs:
        params = {"slugs": ",".join(slugs)}
    response = await _client.get("/api/repositories/internal", params=params)
    response.raise_for_status()
    return [RepositoryDTO.model_validate(r) for r in response.json()["repositories"]]


async def submit_bug_report(
    *,
    chat_session_id: int,
    repository_id: int,
    file_path: str,
    line_estimate: str | None,
    reason: str,
    suggested_fix: str,
) -> int:
    """Submit bug report terverifikasi ke Backend. Return bug_report_id."""
    response = await _client.post(
        "/api/triage/internal/bug-reports",
        json={
            "chatSessionId": chat_session_id,
            "repositoryId": repository_id,
            "filePath": file_path,
            "lineEstimate": line_estimate,
            "reason": reason,
            "suggestedFix": suggested_fix,
        },
    )
    response.raise_for_status()
    return BugReportIdResponse.model_validate(response.json()).bug_report_id


async def close_client() -> None:
    """Dipanggil di lifespan shutdown main.py."""
    await _client.aclose()