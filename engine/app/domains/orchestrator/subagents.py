"""Subagents registry - tempat daftar semua subagent yang available ke orchestrator.

Tiap subagent adalah dict dengan keys (dari skill deep-agents-orchestration):
  - name: identifier unik (dipanggil via task(agent="name"))
  - description: kapan orchestrator harus delegasi ke subagent ini
  - system_prompt: instruksi khusus subagent
  - tools: list tool yang dipegang subagent

Nambah subagent baru: tambah dict baru ke list `subagents` di bawah. Orchestrator
otomatis dapat `task` tool buat mendelegasikannya. Gak perlu ubah `agent.py` atau
`service.py`.

Kenapa tools di-list disini, bukan di import langsung: supaya subagent config ter-centralize
di 1 tempat - kelihatan semua agent yang available dan tool-nya siapa aja, tanan cari ke
file lain.
"""

from app.domains.triage.agent import SYSTEM_PROMPT as TRIAGE_SYSTEM_PROMPT
from app.domains.triage.tools import triage_tools

# Registry subagents - orchestrator dapat akses ke semua ini via `task` tool.
# Nanti tambah subagent baru tinggal append dict ke list ini.
subagents = [
    {
        "name": "triage",
        "description": (
            "Triage dan perbaikan bug di codebase multi-repo. "
            "Kirim pesan ini kalau user lapor bug/masalah kode yang perlu investigasi "
            "riwayat git, cari file, dan verifikasi perbaikan via tsc/lint/test."
        ),
        "system_prompt": TRIAGE_SYSTEM_PROMPT,
        "tools": triage_tools,
    },
]