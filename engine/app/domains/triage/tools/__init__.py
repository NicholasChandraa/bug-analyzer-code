"""Agent tools - satu file per tool buat maintainability.

Pattern:
- Setiap tool file-nya sendiri, namanya sesuai tool.
- Shared helpers (repo resolve, path guard, formatting) di _common.py.
- __init__.py export `triage_tools` list buat agent.py konsumsi.

Kalau nambah tool baru: bikin file baru di sini, tambah ke __all__ + triage_tools.
"""

from app.domains.triage.tools.ripgrep_search import ripgrep_search_tool
from app.domains.triage.tools.read_repo_file import read_repo_file_tool
from app.domains.triage.tools.git_log_blame import git_log_blame_tool
from app.domains.triage.tools.trace_dependencies import trace_dependencies_tool
from app.domains.triage.tools.tsc_no_emit import tsc_no_emit_tool
from app.domains.triage.tools.run_linter_and_tests import run_linter_and_tests_tool
from app.domains.triage.tools.submit_bug_report import submit_bug_report_tool

triage_tools = [
    ripgrep_search_tool,
    read_repo_file_tool,
    git_log_blame_tool,
    trace_dependencies_tool,
    tsc_no_emit_tool,
    run_linter_and_tests_tool,
    submit_bug_report_tool,
]

__all__ = ["triage_tools"]