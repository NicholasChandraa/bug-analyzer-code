"""MCP subagent config - name, description, system prompt, tools assembly.

Tools di-load dinamis dari MCP servers saat startup (client.py di domain yang sama).
Karena itu subagent config dibangun via async builder, bukan static dict kayak triage.
"""

from app.domains.mcp.client import load_mcp_tools

MCP_SYSTEM_PROMPT = """You are the MCP Tools Specialist for a multi-capability AI development platform.

You have access to external tools loaded from MCP servers. Each tool has a name and
description that tells you what it does — use the appropriate tool based on the
orchestrator's instruction.

If no tools are available, inform the orchestrator that no external MCP tools are
currently configured and cannot fulfill the request.

Rules:
- Use the tool that best matches the orchestrator's request.
- If multiple tools could apply, pick the most specific one.
- Report results clearly back so the orchestrator can relay them to the user.
"""

MCP_DESCRIPTION = (
    "External tool operations via MCP servers (e.g., GitHub, Jira, Slack, "
    "databases). Delegate when the user needs to interact with external "
    "services, search issues, create tickets, or any operation requiring "
    "third-party integrations."
)


async def build_mcp_subagent() -> dict:
    """Load MCP tools dan assemble subagent dict untuk orchestrator.

    Returns:
        Subagent config dict siap masuk ke create_deep_agent(subagents=[...]).
    """
    tools = await load_mcp_tools()
    return {
        "name": "mcp",
        "description": MCP_DESCRIPTION,
        "system_prompt": MCP_SYSTEM_PROMPT,
        "tools": tools,
    }