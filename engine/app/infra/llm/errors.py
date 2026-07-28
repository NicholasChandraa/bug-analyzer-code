"""LLM error classification - klasifikasi exception dari LLM provider jadi pesan user-friendly.

Kenapa di infra/llm: error-nya LLM generic (auth, rate limit, model not found, connection),
bukan spesifik domain. Semua agent (triage, code review, security audit) pakai LLM yang sama
dan errornya sama - tinggal pakai fungsi ini.

Pesan dalam bahasa Indonesia, actionable (kasih tahu user/admin apa yang harus diperbaiki).
"""

from app.infra.security.sensitive import mask_sensitive


def classify_llm_error(exc: Exception) -> str:
    """Klasifikasi exception dari LLM provider jadi pesan user-friendly yang actionable.

    LLM provider error (auth, rate limit, model not found) punya signature berbeda - parse
    tipe exception & pesannya buat kasih hint yang jelas ke user/admin, bukan stack trace mentah.
    """
    exc_name = type(exc).__name__
    msg = mask_sensitive(str(exc))
    msg_lower = msg.lower()

    # AuthenticationError / 401 - LLM API key invalid/expired.
    if "auth" in exc_name.lower() or "401" in msg or ("invalid" in msg_lower and "api key" in msg_lower):
        return "Konfigurasi LLM bermasalah: API key invalid atau kedaluwarsa. Hubungi admin."

    # RateLimitError / 429.
    if "rate" in exc_name.lower() or "429" in msg:
        return "LLM sedang sibuk (rate limit). Coba lagi sebentar lagi."

    # ModelNotFoundError / model invalid.
    if "model" in msg_lower and ("not found" in msg_lower or "not available" in msg_lower):
        return "Model LLM yang dikonfigurasi tidak tersedia. Hubungi admin untuk periksa konfigurasi."

    # Connection/timeout ke LLM gateway.
    if "connection" in msg_lower or "timeout" in msg_lower or "unreachable" in msg_lower:
        return "Tidak bisa terhubung ke layanan LLM. Periksa koneksi jaringan atau status gateway."

    # Fallback - tetap mask sensitive, tapi kasih tipe exception buat debugging admin.
    return f"Terjadi kesalahan tak terduga saat memproses permintaan ({exc_name}). Hubungi admin jika berulang."