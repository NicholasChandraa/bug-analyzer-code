"""Mask sensitive data (API keys, tokens, hashes) di text - shared security util.

Dipakai lintas domain (service, tools, logging) supaya API key gak bocor ke log/frontend.
Kenapa di infra/security: concern-nya cross-cutting security, bukan domain-specific. Kalau nanti
ada domain lain (orchestrator, code-review agent), mereka pakai fungsi yang sama.
"""

import re

# Pattern buat deteksi & mask API key & key hash di pesan error LLM.
_API_KEY_PATTERN = re.compile(r"(sk-[A-Za-z0-9]{8})[A-Za-z0-9]+", re.IGNORECASE)
_KEY_HASH_PATTERN = re.compile(r"(Token\s*=\s*)([0-9a-f]{8})[0-9a-f]+", re.IGNORECASE)
_KEY_HASH_PAREN_PATTERN = re.compile(r"(Key Hash\s*\([^)]*\)\s*=\s*)([0-9a-f]{8})[0-9a-f]+", re.IGNORECASE)


def mask_sensitive(text: str) -> str:
    """Mask API key & key hash di text supaya gak bocor ke log/frontend.

    Contoh: "sk-447RL3GpVHsOJECKyZ5ojA" → "sk-447RL3Gp...<redacted>"
    Prefix 8 char tetap dipertahankan buat debugging (cukup tau key mana, gak tau full).
    """
    text = _API_KEY_PATTERN.sub(r"\1...<redacted>", text)
    text = _KEY_HASH_PAREN_PATTERN.sub(r"\1\2...<redacted>", text)
    text = _KEY_HASH_PATTERN.sub(r"\1\2...<redacted>", text)
    return text