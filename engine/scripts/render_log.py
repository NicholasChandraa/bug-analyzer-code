"""
JSONL log viewer - serve HTML modern yang live-refresh tiap 3 detik.

Usage:
    uv run python scripts/render_log.py <log.jsonl>
    uv run python scripts/render_log.py <log.jsonl> --port 9000 --no-open
"""

from __future__ import annotations

import argparse
import http.server
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Log Viewer</title>
<style>
  :root {
    --bg: #0d1117;
    --bg-elev: #161b22;
    --bg-elev-2: #21262d;
    --border: #30363d;
    --text: #e6edf3;
    --text-muted: #7d8590;
    --accent: #58a6ff;
    --info: #58a6ff;
    --debug: #7d8590;
    --warn: #d29922;
    --error: #f85149;
    --success: #3fb950;
  }
  [data-theme="light"] {
    --bg: #ffffff;
    --bg-elev: #f6f8fa;
    --bg-elev-2: #eaeef2;
    --border: #d0d7de;
    --text: #1f2328;
    --text-muted: #656d76;
    --accent: #0969da;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
  }
  header {
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  h1 { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  h1 .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--success); box-shadow: 0 0 8px var(--success);
  }
  .controls { flex: 1; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .search {
    flex: 1; min-width: 200px; max-width: 400px;
    background: var(--bg-elev-2); border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 12px; color: var(--text);
    font-size: 13px; outline: none;
  }
  .search:focus { border-color: var(--accent); }
  .filter-chips { display: flex; gap: 4px; }
  .chip {
    background: var(--bg-elev-2); border: 1px solid var(--border);
    border-radius: 6px; padding: 4px 10px; font-size: 11px;
    font-weight: 500; cursor: pointer; color: var(--text-muted); user-select: none;
  }
  .chip:hover { color: var(--text); }
  .chip.active { color: #fff; background: var(--accent); border-color: var(--accent); }
  .chip.active.level-info { background: var(--info); border-color: var(--info); }
  .chip.active.level-debug { background: var(--debug); border-color: var(--debug); }
  .chip.active.level-warn { background: var(--warn); border-color: var(--warn); }
  .chip.active.level-error { background: var(--error); border-color: var(--error); }
  .chip .count { margin-left: 4px; padding: 0 5px; background: rgba(0,0,0,0.25); border-radius: 8px; font-size: 10px; }
  .btn {
    background: var(--bg-elev-2); border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 10px; cursor: pointer;
    color: var(--text); font-size: 12px;
  }
  .btn:hover { border-color: var(--text-muted); }
  .btn.active { color: var(--success); border-color: var(--success); }
  main { flex: 1; overflow-y: auto; padding: 8px 0; }
  .log-row {
    display: grid;
    grid-template-columns: 130px 60px 1fr 220px;
    gap: 12px; padding: 6px 20px; border-bottom: 1px solid var(--border);
    cursor: pointer; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 12px;
  }
  .log-row:hover { background: var(--bg-elev); }
  .log-row .ts { color: var(--text-muted); white-space: nowrap; }
  .log-row .level {
    font-weight: 600; text-transform: uppercase; font-size: 10px;
    padding: 1px 6px; border-radius: 3px; text-align: center; height: fit-content;
  }
  .log-row .level.INFO { color: var(--info); background: rgba(88,166,255,0.1); }
  .log-row .level.DEBUG { color: var(--debug); background: rgba(125,133,144,0.1); }
  .log-row .level.WARN { color: var(--warn); background: rgba(210,153,34,0.1); }
  .log-row .level.ERROR { color: var(--error); background: rgba(248,81,73,0.1); }
  .log-row .msg { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .log-row .meta { color: var(--text-muted); font-size: 11px; text-align: right; white-space: nowrap; }
  .log-detail {
    background: var(--bg-elev); border-bottom: 1px solid var(--border);
    padding: 12px 20px; display: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: 12px;
  }
  .log-detail.open { display: block; }
  .log-detail pre { white-space: pre-wrap; word-break: break-all; color: var(--text); }
  .key { color: var(--accent); }
  .str { color: var(--success); }
  .num { color: var(--warn); }
  .empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .empty h2 { font-size: 16px; margin-bottom: 8px; color: var(--text); }
  footer {
    background: var(--bg-elev); border-top: 1px solid var(--border);
    padding: 8px 20px; font-size: 11px; color: var(--text-muted);
    display: flex; justify-content: space-between;
  }
  .status-dot {
    display: inline-block; width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); margin-right: 6px;
  }
  .status-dot.error { background: var(--error); }
</style>
</head>
<body data-theme="dark">
<header>
  <h1><span class="dot"></span> Log Viewer</h1>
  <div class="controls">
    <input type="text" class="search" id="search" placeholder="Search msg, logger, file, request_id...">
    <div class="filter-chips" id="chips"></div>
  </div>
  <button class="btn" id="themeBtn" title="Toggle theme">🌙</button>
  <button class="btn active" id="refreshBtn" title="Toggle auto-refresh">⟳ Live</button>
  <button class="btn" id="clearBtn" title="Clear log file">🗑 Clear</button>
</header>
<main id="logContainer">
  <div class="empty" id="empty">
    <h2>No log entries yet</h2>
    <p>Start the engine and send a chat message to see logs here.</p>
  </div>
</main>
<footer>
  <span><span class="status-dot" id="statusDot"></span><span id="status">Connecting...</span></span>
  <span id="counter">0 entries</span>
</footer>
<script>
  const records = [];
  let filtered = [];
  let activeLevels = new Set();
  let searchQuery = "";
  let liveRefresh = true;

  const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG"];

  const escapeHtml = s => (s == null ? "" : String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"));

  const getFileName = p => p ? p.split(/[\\\\/]/).pop() : "";

  function buildRow(record, idx) {
    const level = (record.level || "INFO").toUpperCase();
    const ts = escapeHtml(record.ts || "-");
    const msg = escapeHtml(record.msg || "");
    const file = escapeHtml(getFileName(record.file));
    const line = record.line || "";
    const req = record.request_id && record.request_id !== "-"
      ? `<code>${escapeHtml(record.request_id.slice(0, 8))}</code>` : "";
    return `
      <div class="log-row" data-idx="${idx}">
        <span class="ts">${ts}</span>
        <span class="level ${level}">${level}</span>
        <span class="msg" title="${msg}">${msg}</span>
        <span class="meta">${file}${line ? ":" + line : ""} ${req ? "· " + req : ""}</span>
      </div>
      <div class="log-detail" data-idx="${idx}"><pre>${formatJson(record)}</pre></div>
    `;
  }

  function formatJson(obj) {
    return escapeHtml(JSON.stringify(obj, null, 2))
      .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="str">"$1"</span>')
      .replace(/: (-?\\d+\\.?\\d*)/g, ': <span class="num">$1</span>');
  }

  function updateChips() {
    const counts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    records.forEach(r => {
      const lv = (r.level || "INFO").toUpperCase();
      if (counts[lv] !== undefined) counts[lv]++;
    });
    document.getElementById("chips").innerHTML = LEVELS.map(lv => {
      const active = activeLevels.has(lv) ? "active" : "";
      return `<button class="chip ${active} level-${lv.toLowerCase()}" data-level="${lv}">${lv}<span class="count">${counts[lv]}</span></button>`;
    }).join("");
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const lv = chip.dataset.level;
        activeLevels.has(lv) ? activeLevels.delete(lv) : activeLevels.add(lv);
        render();
      });
    });
  }

  function applyFilter() {
    const q = searchQuery.toLowerCase();
    filtered = records.filter(r => {
      if (activeLevels.size > 0 && !activeLevels.has((r.level || "INFO").toUpperCase())) return false;
      if (!q) return true;
      const hay = [r.msg, r.logger, r.file, r.request_id, r.taskName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function render() {
    applyFilter();
    const c = document.getElementById("logContainer");
    if (filtered.length === 0) {
      c.innerHTML = '<div class="empty"><h2>No matching entries</h2><p>Try clearing filters or search.</p></div>';
    } else {
      const visible = filtered.slice(0, 500);
      c.innerHTML = visible.map((r, i) => buildRow(r, i)).join("");
      c.querySelectorAll(".log-row").forEach(row => {
        row.addEventListener("click", () => {
          const d = c.querySelector(`.log-detail[data-idx="${row.dataset.idx}"]`);
          if (d) d.classList.toggle("open");
        });
      });
    }
    document.getElementById("counter").textContent =
      filtered.length === records.length
        ? `${records.length} entries`
        : `${filtered.length} / ${records.length} entries` + (filtered.length > 500 ? " (showing 500)" : "");
  }

  async function loadLogs() {
    const dot = document.getElementById("statusDot");
    const status = document.getElementById("status");
    try {
      const text = await fetch(`/api/logs?_=${Date.now()}`).then(r => r.text());
      const lines = text.split("\\n").filter(l => l.trim());
      records.length = 0;
      for (const line of lines) {
        try { records.push(JSON.parse(line)); } catch (e) { /* skip */ }
      }
      dot.classList.remove("error");
      status.textContent = `Live · ${records.length} entries`;
      updateChips();
      render();
    } catch (e) {
      dot.classList.add("error");
      status.textContent = "Error: " + e.message;
    }
  }

  document.getElementById("search").addEventListener("input", e => { searchQuery = e.target.value; render(); });
  document.getElementById("themeBtn").addEventListener("click", () => {
    const cur = document.body.dataset.theme;
    document.body.dataset.theme = cur === "dark" ? "light" : "dark";
    document.getElementById("themeBtn").textContent = cur === "dark" ? "☀️" : "🌙";
  });
  document.getElementById("refreshBtn").addEventListener("click", e => {
    liveRefresh = !liveRefresh;
    e.target.classList.toggle("active", liveRefresh);
    if (liveRefresh) loadLogs();
  });
  document.getElementById("clearBtn").addEventListener("click", async () => {
    if (!confirm("Hapus semua log file (main + rotated)? Engine yang menulis ke file ini mungkin akan error sampai restart.")) return;
    const dot = document.getElementById("statusDot");
    const status = document.getElementById("status");
    const btn = document.getElementById("clearBtn");
    btn.disabled = true;
    btn.textContent = "🗑 Clearing...";
    try {
      const res = await fetch("/api/clear");
      const data = await res.json();
      if (data.ok) {
        records.length = 0;
        filtered = [];
        activeLevels.clear();
        searchQuery = "";
        document.getElementById("search").value = "";
        updateChips();
        render();
        status.textContent = `Cleared · deleted ${data.deleted.length} file(s)`;
        dot.classList.remove("error");
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (e) {
      dot.classList.add("error");
      status.textContent = "Clear failed: " + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "🗑 Clear";
    }
  });

  loadLogs();
  setInterval(() => { if (liveRefresh) loadLogs(); }, 3000);
</script>
</body>
</html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    def __init__(self, log_path: Path, *args, **kwargs):
        self.log_path = log_path
        super().__init__(*args, **kwargs)

    def do_GET(self):  # noqa: N802
        if self.path.startswith("/api/logs"):
            try:
                content = self.log_path.read_text(encoding="utf-8") if self.log_path.exists() else ""
            except Exception:
                content = ""
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        elif self.path.startswith("/api/clear"):
            # Hapus main log + semua rotated files (.jsonl.1, .jsonl.2, ...)
            deleted = []
            try:
                if self.log_path.exists():
                    self.log_path.unlink()
                    deleted.append(self.log_path.name)
                for i in range(1, 10):
                    rotated = self.log_path.with_name(f"{self.log_path.name}.{i}")
                    if rotated.exists():
                        rotated.unlink()
                        deleted.append(rotated.name)
            except Exception as e:
                self._json({"error": str(e)}, 500)
                return
            self._json({"deleted": deleted, "ok": True})
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML.encode("utf-8"))

    def _json(self, payload: dict, status: int = 200) -> None:
        import json
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # noqa: A003
        pass


def main() -> int:
    p = argparse.ArgumentParser(description="JSONL log viewer (modern, clean, live)")
    p.add_argument("log_file", type=Path, help="Path to .jsonl log file")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--no-open", action="store_true")
    args = p.parse_args()

    if not args.log_file.exists():
        print(f"❌ Log file not found: {args.log_file}")
        return 1

    class Server(socketserver.TCPServer):
        allow_reuse_address = True

    server = Server(("127.0.0.1", args.port), lambda *a, **kw: Handler(args.log_file, *a, **kw))
    url = f"http://localhost:{args.port}"
    print(f"📂 {url}  ·  file: {args.log_file}")
    print("   Press Ctrl+C to stop.")

    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
