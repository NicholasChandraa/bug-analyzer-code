"""Triage subagent domain - bug investigation & verified fix across multi-repo codebases.

Subagent ini handle seluruh flow triage: grep code, baca file, cek git history,
draft patch, verifikasi via tsc/lint/test, lalu submit bug report ke Backend.

Tools & schemas ada di domain yang sama (tools/, schemas.py). Subagent config
(name, description, system_prompt, tools) di agent.py — static dict karena tools
sudah ada di import time.
"""