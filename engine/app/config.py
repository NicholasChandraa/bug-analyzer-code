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

    # Path file log. Default: <repo-root>/logs/app.log (auto-rotate 10MB, keep 5 file).
    # Set "" untuk disable file logging (cuma stdout).
    # Path dari .env di-resolve absolut di get_settings() supaya gak ketergantungan cwd worker.
    LOG_FILE_PATH: str = ""

    # MCP servers config - JSON string, format:
    # {"server_name": {"transport": "http"|"sse"|"stdio", "url": "...", "command": "...", "args": [...], "env": {...}}}
    # Kosong = gak ada MCP server. Set di .env: MCP_SERVERS='{"github": {"transport":"http","url":"..."}}'
    MCP_SERVERS: str = ""


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Resolve LOG_FILE_PATH absolut relatif ke repo root kalau path-nya bukan absolute
    # (jadi worker granian yang spawn dari cwd manapun tetep bisa nulis ke log file).
    if settings.LOG_FILE_PATH and not Path(settings.LOG_FILE_PATH).is_absolute():
        repo_root = Path(__file__).resolve().parent.parent.parent
        settings.LOG_FILE_PATH = str((repo_root / settings.LOG_FILE_PATH).resolve())
    return settings


settings = get_settings()
