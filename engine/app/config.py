from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Path absolut ke .env, relatif dari file ini (engine/app/config.py → engine/.env).
# Pakai absolut supaya gak tergantung cwd worker process (granian spawn worker yang cwd-nya
# gak tentu, makanya env_file=".env" relatif kadang gak ketemu).
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_PATH), extra="ignore")

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

    # Log level: INFO (default, prod) atau DEBUG (lihat detail chunk/messages agent loop).
    LOG_LEVEL: str = "INFO"

    # MCP servers config - JSON string, format:
    # {"server_name": {"transport": "http"|"sse"|"stdio", "url": "...", "command": "...", "args": [...], "env": {...}}}
    # Kosong = gak ada MCP server. Set di .env: MCP_SERVERS='{"github": {"transport":"http","url":"..."}}'
    MCP_SERVERS: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
