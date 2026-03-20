# Weavy MCP Server + Workflow Architect Skill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Playwright-based MCP server that automates Weavy.ai's browser UI, plus a workflow architect skill for planning and executing creative pipelines.

**Architecture:** Node.js stdio MCP server using `@modelcontextprotocol/sdk` for protocol handling and Playwright for browser automation. The server maintains a persistent Chromium session to `app.weavy.ai`, reusing the user's existing login. A companion skill at `~/.claude/skills/weavy-architect/` provides domain knowledge for planning workflows.

**Tech Stack:** Node.js 24, `@modelcontextprotocol/sdk`, Playwright, ES modules

---

## Chunk 1: MCP Server Foundation

### Task 1: Initialize Node.js project

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/package.json`

- [ ] **Step 1: Initialize project with dependencies**

```bash
cd ~/.claude/mcp-servers/weavy-mcp
npm init -y
npm install @modelcontextprotocol/sdk playwright
npx playwright install chromium
```

- [ ] **Step 2: Configure package.json for ES modules**

Set `"type": "module"` and `"bin": "./server.js"` in package.json.

- [ ] **Step 3: Commit**

```bash
cd ~/.claude/mcp-servers/weavy-mcp
git init
git add package.json package-lock.json
git commit -m "chore: initialize weavy-mcp project with dependencies"
```

---

### Task 2: Browser session manager

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/browser.js`

- [ ] **Step 1: Create browser session module**

This module handles:
- Launching Chromium with a persistent user data dir (`~/.claude/mcp-servers/weavy-mcp/.browser-data/`)
- Navigating to `app.weavy.ai`
- Detecting login state (checking for canvas elements vs login form)
- Providing the active page to tool handlers
- Graceful shutdown

Key exports:
- `getBrowser()` — returns or launches browser
- `getPage()` — returns the active Weavy page
- `ensureLoggedIn()` — checks login state, prompts user if needed
- `closeBrowser()` — cleanup

- [ ] **Step 2: Test browser launch manually**

```bash
node -e "import('./browser.js').then(m => m.getBrowser().then(b => { console.log('Browser launched'); return m.closeBrowser(); }))"
```

- [ ] **Step 3: Commit**

```bash
git add browser.js
git commit -m "feat: add browser session manager with persistent login"
```

---

### Task 3: MCP server entry point with first tool (screenshot)

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/server.js`

- [ ] **Step 1: Create MCP server with weavy_screenshot tool**

The server:
- Uses `@modelcontextprotocol/sdk/server/stdio` for stdio transport
- Registers tools via `server.tool()`
- First tool: `weavy_screenshot` — takes a screenshot, returns as base64 image

- [ ] **Step 2: Test the server locally**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node server.js
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: MCP server entry point with screenshot tool"
```

---

### Task 4: Configure MCP globally

**Files:**
- Create: `~/.claude/mcp.json`

- [ ] **Step 1: Create global MCP config**

```json
{
  "mcpServers": {
    "weavy": {
      "command": "node",
      "args": ["/Users/redmh/.claude/mcp-servers/weavy-mcp/server.js"]
    }
  }
}
```

- [ ] **Step 2: Verify by restarting Claude Code and checking tool availability**

---

## Chunk 2: Canvas & Node Tools

### Task 5: Project management tools

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/projects.js`

- [ ] **Step 1: Implement weavy_open_project**

Opens an existing project by name or creates a new one. Navigates to the project's canvas.

- [ ] **Step 2: Implement weavy_list_projects**

Reads the project list from the Weavy dashboard.

- [ ] **Step 3: Commit**

```bash
git add tools/projects.js
git commit -m "feat: add project management tools (open, list)"
```

---

### Task 6: Node creation tool

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/nodes.js`

- [ ] **Step 1: Implement weavy_add_node**

Right-clicks on canvas at a position → types node name in search → clicks the matching result. Parameters:
- `name` (string): Node name to search for (e.g., "Flux 2 Pro", "Prompt", "Crop")
- `x`, `y` (number, optional): Canvas position, defaults to center

- [ ] **Step 2: Implement weavy_remove_node**

Selects a node and deletes it.

- [ ] **Step 3: Commit**

```bash
git add tools/nodes.js
git commit -m "feat: add node creation and removal tools"
```

---

### Task 7: Node configuration tools

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/configure.js`

- [ ] **Step 1: Implement weavy_set_prompt**

Clicks on a Prompt node, focuses the text area, clears it, and types the new prompt text.

- [ ] **Step 2: Implement weavy_configure_node**

Clicks a node to open its properties panel, then sets specified parameters (dropdowns, sliders, text fields) by label matching.

- [ ] **Step 3: Implement weavy_import_file**

Clicks an Import node, uploads a file from a local path.

- [ ] **Step 4: Commit**

```bash
git add tools/configure.js
git commit -m "feat: add node configuration tools (prompt, params, import)"
```

---

### Task 8: Connection tools

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/connections.js`

- [ ] **Step 1: Implement weavy_connect_nodes**

Identifies output handle of source node and input handle of target node, performs drag from source to target. Parameters:
- `sourceNode` (string): Name/label of source node
- `targetNode` (string): Name/label of target node
- `sourceOutput` (string, optional): Specific output handle name
- `targetInput` (string, optional): Specific input handle name

- [ ] **Step 2: Implement weavy_disconnect_nodes**

Right-clicks a connection line and removes it, or disconnects from a handle.

- [ ] **Step 3: Commit**

```bash
git add tools/connections.js
git commit -m "feat: add node connection tools"
```

---

## Chunk 3: Execution & Export Tools

### Task 9: Execution tools

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/execute.js`

- [ ] **Step 1: Implement weavy_run_node**

Clicks the Run button on a specific generative node. Waits for completion (watches for loading spinner to disappear or result to appear).

- [ ] **Step 2: Implement weavy_run_workflow**

Finds all generative nodes with Run buttons and executes them in dependency order.

- [ ] **Step 3: Implement weavy_export**

Adds Export node if needed, connects it, triggers download. Returns the file path.

- [ ] **Step 4: Commit**

```bash
git add tools/execute.js
git commit -m "feat: add execution and export tools"
```

---

### Task 10: Design App tool

**Files:**
- Create: `~/.claude/mcp-servers/weavy-mcp/tools/app.js`

- [ ] **Step 1: Implement weavy_create_app**

Adds Output node, connects to final result node, switches to App tab, publishes. Returns share URL.

- [ ] **Step 2: Commit**

```bash
git add tools/app.js
git commit -m "feat: add Design App creation tool"
```

---

### Task 11: Register all tools in server.js

**Files:**
- Modify: `~/.claude/mcp-servers/weavy-mcp/server.js`

- [ ] **Step 1: Import and register all tool modules**

Each tool module exports a `register(server)` function. Import all and call them.

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: register all tool modules in server"
```

---

## Chunk 4: Weavy Workflow Architect Skill

### Task 12: Create skill structure

**Files:**
- Create: `~/.claude/skills/weavy-architect/SKILL.md`
- Create: `~/.claude/skills/weavy-architect/instructions/principles.md`
- Create: `~/.claude/skills/weavy-architect/instructions/workflow.md`
- Create: `~/.claude/skills/weavy-architect/instructions/anti-patterns.md`
- Create: `~/.claude/skills/weavy-architect/references/models.md`
- Create: `~/.claude/skills/weavy-architect/references/nodes.md`
- Create: `~/.claude/skills/weavy-architect/references/workflow-patterns.md`
- Create: `~/.claude/skills/weavy-architect/templates/workflow-plan.md`
- Create: `~/.claude/skills/weavy-architect/eval/checklist.md`
- Create: `~/.claude/skills/weavy-architect/eval/advisory-board.md`
- Create: `~/.claude/skills/weavy-architect/examples/good/` (example workflows)
- Create: `~/.claude/skills/weavy-architect/examples/bad/.gitkeep`

- [ ] **Step 1: Create SKILL.md orchestrator**

Defines the skill's purpose: plan node-based creative workflows on Weavy.ai and execute them via MCP tools. Steps: understand goal → select models → design node graph → execute via MCP → verify output.

- [ ] **Step 2: Create instructions/principles.md**

Core principles: node graph thinking, model selection by use case, credit optimization, connection type safety (color coding), iterative refinement.

- [ ] **Step 3: Create instructions/workflow.md**

Step-by-step process: gather brief → recommend models → design pipeline → create nodes via MCP → connect → configure → run → review → iterate.

- [ ] **Step 4: Create instructions/anti-patterns.md**

What NOT to do: connecting incompatible types, running without all inputs connected, using expensive models for iteration, ignoring credit costs.

- [ ] **Step 5: Create references/models.md**

Complete reference of all 24 image models and 34 video models with credit costs, capabilities, and when to use each.

- [ ] **Step 6: Create references/nodes.md**

Complete reference of all node types: editing (9), matte (6), text (6), helpers (10), iterators (3), datatypes (6).

- [ ] **Step 7: Create references/workflow-patterns.md**

Common patterns: prompt → multi-model comparison, image → video pipeline, batch generation with iterators, style transfer with LoRA, Design App creation.

- [ ] **Step 8: Create templates/workflow-plan.md**

Template for planning a workflow before execution.

- [ ] **Step 9: Create eval/checklist.md and eval/advisory-board.md**

Quality gates and reviewer personas for workflow designs.

- [ ] **Step 10: Commit**

```bash
cd ~/.claude/skills/weavy-architect
git init
git add .
git commit -m "feat: create weavy workflow architect skill"
```

---

## Chunk 5: Memory & Final Wiring

### Task 13: Save project memory

**Files:**
- Create: `~/.claude/projects/-Users-redmh-Documents-Projects/memory/weavy-mcp.md`
- Modify: `~/.claude/projects/-Users-redmh-Documents-Projects/memory/MEMORY.md`

- [ ] **Step 1: Create memory file with Weavy MCP details**

Server location, how it works, skill location, key facts about the setup.

- [ ] **Step 2: Add pointer to MEMORY.md**

- [ ] **Step 3: Done**
