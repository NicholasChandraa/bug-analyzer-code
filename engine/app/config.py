from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres milik Engine sendiri - cuma buat tabel checkpointer LangGraph,
    # bukan tabel bisnis (itu tetap punya Backend, diakses lewat backend_client.py)
    DATABASE_URL: str

    BACKEND_URL: str = "http://localhost:3001"

    LLM_API_KEY: str
    LLM_BASE_URL: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"

    # Harus resolve di PATH - ripgrep gak ada wheel PyPI resmi kayak @vscode/ripgrep di npm,
    # jadi wajib diinstall sebagai binary sistem (winget/choco/apt/brew).
    RIPGREP_PATH: str = "rg"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
