# Weavy MCP Server

MCP server for automating [Weavy.ai](https://app.weavy.ai) creative workflows via Playwright browser automation.

## What It Does

This server gives Claude Code direct control over Weavy's node-based canvas. It launches a Chromium browser, connects to your Weavy account, and exposes tools for building creative pipelines programmatically.

## Tools

| Tool | Description |
|------|-------------|
| `weavy_screenshot` | Capture current canvas state |
| `weavy_list_projects` | List all projects from dashboard |
| `weavy_open_project` | Open existing project or create new |
| `weavy_add_node` | Add any node type to canvas (models, editing, text, helpers) |
| `weavy_remove_node` | Remove a node from canvas |
| `weavy_get_canvas_state` | List all visible nodes with positions |
| `weavy_set_prompt` | Enter text into a Prompt node |
| `weavy_configure_node` | Set node parameters (aspect ratio, model settings, etc.) |
| `weavy_import_file` | Upload a file via Import node |
| `weavy_connect_nodes` | Connect output of one node to input of another |
| `weavy_disconnect_nodes` | Remove a connection between nodes |
| `weavy_run_node` | Execute a generative node and wait for completion |
| `weavy_export` | Download output via Export node |
| `weavy_create_app` | Publish workflow as a Design App |

## Setup

```bash
cd ~/.claude/mcp-servers/weavy-mcp
npm install
npx playwright install chromium
```

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "weavy": {
      "command": "node",
      "args": ["/path/to/weavy-mcp/server.js"]
    }
  }
}
```

## Authentication

No API keys needed. The server uses a persistent Chromium profile at `.browser-data/`. On first use, it opens a browser window — log into Weavy manually once, and the session persists.

## Companion Skill

Pair with the `weavy-architect` skill (`~/.claude/skills/weavy-architect/`) for guided workflow design with model selection, node graph planning, and credit optimization.

## Tech Stack

- Node.js + ES modules
- `@modelcontextprotocol/sdk` for MCP protocol
- Playwright for browser automation
