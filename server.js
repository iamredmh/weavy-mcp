#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { closeBrowser } from "./browser.js";

import { register as registerProjects } from "./tools/projects.js";
import { register as registerNodes } from "./tools/nodes.js";
import { register as registerConfigure } from "./tools/configure.js";
import { register as registerConnections } from "./tools/connections.js";
import { register as registerExecute } from "./tools/execute.js";
import { register as registerApp } from "./tools/app.js";

const server = new McpServer({
  name: "weavy",
  version: "1.0.0",
  description: "Automate Weavy.ai creative workflows via browser automation",
});

// Register all tool modules
registerProjects(server);
registerNodes(server);
registerConfigure(server);
registerConnections(server);
registerExecute(server);
registerApp(server);

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
