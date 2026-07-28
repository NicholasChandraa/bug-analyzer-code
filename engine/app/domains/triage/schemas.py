"""Pydantic wire models (Backend↔Engine JSON) + tool-arg schemas (LLM-facing).

Dua keluarga yang SENGAJA dipisah:
- Wire schemas: Backend↔Engine JSON, camelCase alias (match DTO convention codebase).
- Tool-arg schemas: LLM-facing, plain snake_case - LLM cuma lihat apa yang kita kasih,
  gak perlu mirror nama field TS.
"""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base buat wire schemas - alias camelCase, tapi masih bisa populate via snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Wire schemas (Backend↔Engine)
# ---------------------------------------------------------------------------


class AgentInvokeRequest(CamelModel):
    chat_session_id: int
    content: str


class RepositoryDTO(CamelModel):
    """Shape yang dikirim Backend lewat endpoint /api/repositories/internal.
    Pydantic v2 default ignore extra fields, jadi gak masalah kalau Backend kirim lebih banyak.
    """

    id: int
    name: str
    slug: str
    local_path: str
    last_synced_at: str | None = None
    created_at: str = ""


class BugReportIdResponse(CamelModel):
    bug_report_id: int


# ---------------------------------------------------------------------------
# Tool-arg schemas (LLM-facing, snake_case)
# ---------------------------------------------------------------------------


class RipgrepSearchArgs(BaseModel):
    query: str = Field(description="Kata kunci atau frasa yang ingin dicari secara harfiah")
    repo_slugs: list[str] | None = Field(
        default=None, description="Daftar slug repositori untuk membatasi ruang lingkup pencarian"
    )


class ReadRepoFileArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdaftar")
    file_path: str = Field(description="Path file relatif terhadap root repositori")
    start_line: int | None = Field(default=None, description="Nomor baris awal (opsional)")
    end_line: int | None = Field(default=None, description="Nomor baris akhir (opsional)")


class GitLogBlameArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdaftar")
    file_path: str = Field(description="Path file relatif terhadap root repositori")
    mode: Literal["log", "blame"] = Field(
        description="Mode pemeriksaan: 'log' untuk riwayat commit, 'blame' untuk riwayat pembuat baris"
    )


class TraceDependenciesArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdaftar")
    module_path: str = Field(description="Spesifikasi modul atau path relatif import yang ingin dilacak")


class TscNoEmitArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdaftar")


class RunLinterAndTestsArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdaftar")


class SubmitBugReportArgs(BaseModel):
    repo_slug: str = Field(description="Slug repositori yang terdampak")
    file_path: str = Field(description="Path file utama yang diperbaiki")
    line_estimate: str | None = Field(
        default=None,
        description="Perkiraan baris/rentang baris yang bermasalah, misal '42' atau '40-55'",
    )
    reason: str = Field(description="Penjelasan akar masalah (root cause)")
    suggested_fix: str = Field(description="Unified diff patch atau deskripsi perbaikan kode")