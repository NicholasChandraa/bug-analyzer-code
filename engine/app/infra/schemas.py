"""Wire schemas (Backend↔Engine JSON) - cross-domain, dipakai orchestrator, triage, dan mcp.

camelCase alias match DTO convention codebase. Pydantic v2 default ignore extra fields,
jadi gak masalah kalau Backend kirim lebih banyak.
"""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base buat wire schemas - alias camelCase, tapi masih bisa populate via snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AgentInvokeRequest(CamelModel):
    chat_session_id: int
    content: str


class RepositoryDTO(CamelModel):
    """Shape yang dikirim Backend lewat endpoint /api/repositories/internal."""

    id: int
    name: str
    slug: str
    local_path: str
    last_synced_at: str | None = None
    created_at: str = ""


class BugReportIdResponse(CamelModel):
    bug_report_id: int