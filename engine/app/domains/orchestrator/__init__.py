"""Orchestrator domain - main agent yang menerima request user, klasifikasi intent,
lalu delegasi ke subagent yang sesuai.

Pattern (dari skill deep-agents-orchestration):
- Orchestrator punya `task` tool (built-in deepagents) buat spawn subagent.
- Subagent dieksekusi otonom, return final report ke orchestrator.
- Subagent stateless - semua instruksi dalam 1 call.

Subagents di-define inline di agent.py (triage, mcp). Nambah subagent baru:
tambah dict ke list di create_orchestrator_agent().
"""