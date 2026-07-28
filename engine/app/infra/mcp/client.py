"""MCP client loader - connect ke MCP server eksternal, load tools-nya jadi LangChain tools.

Pattern (dari skill managed-deep-agents + langchain-mcp-adapters docs):
- MCP servers dideklarasi via config (JSON string di .env: MCP_SERVERS).
- Loader parse config, connect ke tiap server, ambil tools-nya.
- Tools otomatis jadi LangChain @tool - agent gak tau beda native vs MCP remote.
- Dipanggil di lifespan startup, tools di-inject ke subagent yang butuh.

Transport support: http, sse, stdio (semua didukung langchain-mcp-adapters).
"""

import json
import logging
from dataclasses import dataclass
from typing import Any

from langchain_mcp_adapters.client import MultiServerMCPClient  # type: ignore[import-not-found]  # runtime OK, Pylance stub missing

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class McpServerConfig:
    """Config 1 MCP server - parsed dari JSON string."""

    name: str
    transport: str  # "http" | "sse" | "stdio"
    # http/sse: url. stdio: command + args.
    url: str | None = None
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, str] | None = None

    def to_client_config(self) -> dict[str, Any]:
        """Convert ke format yang MultiServerMCPClient expect."""
        config: dict[str, Any] = {"transport": self.transport}
        if self.transport in ("http", "sse"):
            config["url"] = self.url
        elif self.transport == "stdio":
            config["command"] = self.command
            config["args"] = self.args or []
            if self.env:
                config["env"] = self.env
        return config


def parse_mcp_servers() -> list[McpServerConfig]:
    """Parse MCP_SERVERS JSON string dari config jadi list of McpServerConfig.

    Format JSON:
    {
        "server_name": {
            "transport": "http",
            "url": "https://mcp.example.com"
        },
        "another": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
            "env": {"GITHUB_TOKEN": "..."}
        }
    }
    """
    raw = settings.MCP_SERVERS.strip()
    if not raw:
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("MCP_SERVERS invalid JSON: %s", exc)
        return []

    servers: list[McpServerConfig] = []
    for name, cfg in data.items():
        transport = cfg.get("transport", "http")
        servers.append(
            McpServerConfig(
                name=name,
                transport=transport,
                url=cfg.get("url"),
                command=cfg.get("command"),
                args=cfg.get("args"),
                env=cfg.get("env"),
            )
        )
    return servers


async def load_mcp_tools() -> dict[str, list]:
    """Connect ke semua MCP server, return tools dikelompokkan per server name.

    Pattern: MCP tools di-assign ke subagent yang relevan di subagents.py (bukan inject ke
    semua, bukan bikin subagent khusus). Triage butuh github MCP? Assign github tools ke
    triage. Code review butuh analytics MCP? Assign ke code_review.

    Returns:
        Dict {server_name: [LangChain tools]}. Kosong dict kalau gak ada MCP config.
        Pemanggil (subagents.py) pilih tools mana yang ke subagent mana.

    Contoh return: {"github": [search_issues, create_pr], "analytics": [query_data]}
    """
    servers = parse_mcp_servers()
    if not servers:
        logger.info("No MCP servers configured (MCP_SERVERS empty)")
        return {}

    logger.info("Loading MCP tools from %d server(s): %s", len(servers), [s.name for s in servers])

    tools_by_server: dict[str, list] = {}
    for server in servers:
        try:
            client = MultiServerMCPClient({server.name: server.to_client_config()})
            tools = await client.get_tools()
            logger.info("  [%s] loaded %d MCP tools", server.name, len(tools))
            for tool in tools:
                logger.debug("    MCP tool: %s", tool.name)
            tools_by_server[server.name] = tools
        except Exception as exc:
            logger.error("  [%s] failed to connect, skipped: %s", server.name, exc)

    return tools_by_server