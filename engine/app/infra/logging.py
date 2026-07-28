"""Plain-but-colored logging via Rich - format simple, traceback mentah.

Pakai RichHandler buat colored level (INFO/WARNING/ERROR), tapi rich_tracebacks=False
supaya traceback plain (bukan kotak), sama format message mentah: input user, dict langchain
chunk, jawaban AI, apa adanya.
"""

import logging
import sys
from contextvars import ContextVar

from rich.logging import RichHandler

_request_id: ContextVar[str] = ContextVar("request_id", default="")


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


def configure_logging() -> None:
    """Configure root logger dengan RichHandler (colored, no tracebacks box)."""
    from app.config import settings

    level_name = getattr(settings, "LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    handler = RichHandler(
        rich_tracebacks=False,  # traceback plain (bukan kotak) - mentah sesuai request.
        show_path=False,        # gak perlu file:line, sudah ada di message context.
        markup=True,
        log_time_format="[%X]",
        show_level=True,
    )
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(
        logging.Formatter("%(message)s [dim]req=%(request_id)s[/dim]", datefmt="[%X]")
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Turunkan noise dari library yang terlalu chatty di dev.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    # deepagents: expected debug logs (Bedrock not installed, no model profile) - noisy, suppress.
    logging.getLogger("deepagents").setLevel(logging.WARNING)