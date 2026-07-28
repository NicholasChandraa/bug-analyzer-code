"""Orchestrator domain - main agent yang menerima request user, klasifikasi intent,
lalu delegasi ke subagent yang sesuai.

Pattern (dari skill deep-agents-orchestration):
- Orchestrator punya `task` tool (built-in deepagents) buat spawn subagent.
- Subagent dieksekusi otonom, return final report ke orchestrator.
- Subagent stateless - semua instruksi dalam 1 call.

Sekarang cuma 1 subagent (triage), tapi struktur registry udah siap buat nambah
subagent lain (code-review, security-audit, dll) tanpa ubah orchestrator code.
"""