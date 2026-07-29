"""Plain-but-colored logging via Rich - format simple, traceback mentah.

Pakai RichHandler buat colored level (INFO/WARNING/ERROR), tapi rich_tracebacks=False
supaya traceback plain (bukan kotak), sama format message mentah: input user, dict langchain
chunk, jawaban AI, apa adanya.

Optional file output: kalau settings.LOG_FILE_PATH di-set, log juga ditulis ke file dengan
RotatingFileHandler (plain text, no markup, supaya mudah di-grep/tail).
"""

import logging
import sys
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler
from rich.text import Text

_request_id: ContextVar[str] = ContextVar("request_id", default="")

logger = logging.getLogger(__name__)


def get_request_id() -> str:
    return _request_id.get()


def set_request_id(request_id: str) -> None:
    _request_id.set(request_id)


class _RequestIdFilter(logging.Filter):
    """Suntik request_id dari contextvars ke setiap LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        rid = _request_id.get()
        record.request_id = rid or "-"
        return True


class _FileLinkFilter(logging.Filter):
    """Suntik link_path (file:// URI dengan forward slash) ke setiap LogRecord.

    Windows path D:\\foo\\bar.py jadi file:///D:/foo/bar.py supaya VS Code terminal
    bisa Ctrl+click langsung ke file.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        pathname = getattr(record, "pathname", "")
        # Pastikan absolute; ganti backslash Windows jadi forward slash.
        abs_path = Path(pathname).resolve().as_posix()
        record.link_path = f"file:///{abs_path}"
        return True


class _RightAlignedLinkFormatter(logging.Formatter):
    """Formatter yang meletakkan file:line + request_id di pojok kanan.

    Return string (bukan Text) supaya RichHandler bisa parse markup [link=...] dengan
    Text.from_markup. Padding dihitung dari lebar terminal host (bukan dari console Rich
    - karena handler-nya mungkin punya console yang berbeda ukuran dari terminal host).
    """

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        file_link_markup = f"[link={record.link_path}]{record.filename}:{record.lineno}[/link]"
        meta = f"req={record.request_id}"
        right_part = f"{file_link_markup} {meta}"

        # Lebar terminal host via shutil (bukan Console - itu ngukur console Rich).
        width = _terminal_width()
        # Panjang "kiri" yang sudah terpakai: timestamp + level + message + spasi.
        # Kita gak bisa hitung persis waktu/stamp/level prefix, jadi estimate dengan
        # message + 30 char allowance buat prefix logger.
        left_len = len(message) + 30
        pad = max(1, width - left_len - len(_visible_len(right_part)))
        return f"{message} {' ' * pad}{right_part}"


def _visible_len(s: str) -> str:
    """Strip Rich markup tags supaya bisa hitung panjang visible text."""
    import re
    return re.sub(r"\[/?[^\]]+\]", "", s)


def _terminal_width(default: int = 120) -> int:
    """Ambil lebar terminal host. Fallback ke default kalau gak bisa."""
    try:
        import shutil
        return shutil.get_terminal_size().columns
    except Exception:
        return default


class _JsonArrayFileHandler(RotatingFileHandler):
    """RotatingFileHandler yang emit JSONL (satu JSON per line).

    JSONL (JSON Lines) = satu JSON object per line, newline-separated. Valid JSON
    Parser yang support JSONL: jq, jq -c, Python json.loads per line, dll.

    Format ini lebih reliable dari single-array JSON karena:
    - Append-friendly (gak perlu rewrite seluruh file)
    - Crash-safe (gak ada wrapper "[" / "]" yang bisa ilang pas abrupt shutdown)
    - Stream-friendly (bisa di-tail, grep, jq, jq -c)
    - HTML viewer bisa parse per-line tanpa butuh wrapper

    Untuk render ke HTML yang readable, lihat scripts/render_log.py.
    """

    _RESERVED = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "asctime", "message", "request_id",
    }

    def format(self, record: logging.LogRecord) -> str:
        import json
        import time

        # Format timestamp manual (Handler gak punya formatTime - itu method Formatter).
        datefmt = getattr(self, "datefmt", "%Y-%m-%d %H:%M:%S")
        ts = time.strftime(datefmt, time.localtime(record.created))

        payload: dict = {
            "ts": ts,
            "level": record.levelname,
            "logger": record.name,
            "file": record.filename,
            "line": record.lineno,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        for key, value in record.__dict__.items():
            if key not in self._RESERVED and not key.startswith("_"):
                try:
                    json.dumps(value)
                    payload[key] = value
                except (TypeError, ValueError):
                    payload[key] = repr(value)

        return json.dumps(payload, ensure_ascii=False, default=str)

    def emit(self, record: logging.LogRecord) -> None:
        if self.shouldRollover(record):
            self.doRollover()

        msg = self.format(record)
        self.stream.write(msg + "\n")
        self.flush()


def configure_logging() -> None:
    """Configure root logger dengan RichHandler (colored, no tracebacks box)."""
    from app.config import settings

    level_name = getattr(settings, "LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    console = Console(
        force_terminal=True,
        color_system="auto",
    )
    handler = RichHandler(
        console=console,
        rich_tracebacks=False,  # traceback plain (bukan kotak) - mentah sesuai request.
        show_path=False,        # kita render path sendiri sebagai Rich hyperlink.
        markup=True,
        log_time_format="[%X]",
        show_level=True,
    )
    handler.addFilter(_RequestIdFilter())
    handler.addFilter(_FileLinkFilter())
    handler.setFormatter(_RightAlignedLinkFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Optional file output: JSONL (satu JSON object per line) - simple, robust, parseable.
    # Untuk render ke HTML viewer, pakai scripts/render_log.py.
    log_file = getattr(settings, "LOG_FILE_PATH", "").strip()
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        if not log_path.suffix:
            log_path = log_path.with_suffix(".jsonl")
            settings.LOG_FILE_PATH = str(log_path)
        file_handler = _JsonArrayFileHandler(
            log_path,
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        # _JsonArrayFileHandler punya format() built-in (JSON object per line).
        # datefmt di-set via attribute, bukan via Formatter constructor.
        file_handler.datefmt = "%Y-%m-%d %H:%M:%S"
        file_handler.setLevel(level)
        root.addHandler(file_handler)
        logger.info("file logging enabled: %s", log_path)

    # Turunkan noise dari library yang terlalu chatty di dev.
    # Logger-logger ini banyak ngomongin internal HTTP request/response, prompt dumping, dll.
    for noisy in (
        "httpx",
        "httpcore",
        "openai",
        "openai._base_client",
        "openai._client",
        "openai.resources",
        "anthropic",
        "anthropic._base_client",
        "urllib3",
        "asyncio",
        "deepagents",  # expected debug logs (Bedrock not installed, no model profile)
        "langchain",
        "langchain_core",
        "langgraph",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)