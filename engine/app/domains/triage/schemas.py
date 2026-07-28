"""Tool-arg schemas (LLM-facing, snake_case) buat triage tools.

Wire schemas (Backend↔Engine JSON) ada di infra/schemas.py - cross-domain, dipakai
orchestrator routes, backend_client, dan tools. Tool-arg schemas cuma dipakai triage tools,
jadi tetap di sini.

LLM cuma liat apa yang kita kasih lewat Field(description=...) - gak perlu mirror nama field TS.
"""

from typing import Literal

from pydantic import BaseModel, Field


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