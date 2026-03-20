import { z } from "zod";
import { getPage, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_add_node",
    "Add a node to the Weavy canvas by searching for it in the right-click menu. Supports all node types: models (Flux 2 Pro, Veo 3, GPT Image 1, etc.), editing tools (Crop, Blur, Compositor, etc.), text tools (Prompt, Prompt Concatenator, etc.), helpers (Import, Export, Router, etc.)",
    {
      name: z.string().describe("Name of the node to add (e.g., 'Flux 2 Pro', 'Prompt', 'Crop', 'Import')"),
      x: z.number().optional().describe("X position on canvas (default: center)"),
      y: z.number().optional().describe("Y position on canvas (default: center)"),
    },
    async ({ name, x, y }) => {
      const page = await getPage();
      const viewport = page.viewportSize();
      const targetX = x ?? Math.floor(viewport.width / 2);
      const targetY = y ?? Math.floor(viewport.height / 2);

      // Right-click on the canvas to open the node menu
      await page.mouse.click(targetX, targetY, { button: "right" });
      await page.waitForTimeout(500);

      // Look for the search input in the context menu
      const searchInput = await page.$(
        'input[type="text"], input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]'
      );

      if (searchInput) {
        await searchInput.fill(name);
        await page.waitForTimeout(800);

        // Click the first matching result
        const result = await page.$(
          `[class*="menu"] [class*="item"]:has-text("${name}"), [class*="result"]:has-text("${name}"), [role="option"]:has-text("${name}"), [class*="node-option"]:has-text("${name}")`
        );
        if (result) {
          await result.click();
          await page.waitForTimeout(500);

          const img = await screenshot();
          return {
            content: [
              { type: "text", text: `Added "${name}" node at position (${targetX}, ${targetY})` },
              { type: "image", data: img, mimeType: "image/png" },
            ],
          };
        }
      }

      // Fallback: maybe the menu uses a different pattern
      // Try clicking any text matching the node name in the context menu
      const menuItem = await page.$(`text="${name}"`);
      if (menuItem) {
        await menuItem.click();
        await page.waitForTimeout(500);

        const img = await screenshot();
        return {
          content: [
            { type: "text", text: `Added "${name}" node at position (${targetX}, ${targetY})` },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      // If nothing worked, take screenshot for debugging
      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Could not find node "${name}" in the menu. Screenshot of current state:` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_remove_node",
    "Remove a node from the canvas by clicking it and pressing Delete",
    {
      nodeLabel: z.string().describe("Label/name text visible on the node to remove"),
    },
    async ({ nodeLabel }) => {
      const page = await getPage();

      // Find and click the node by its label text
      const node = await page.$(`text="${nodeLabel}"`);
      if (!node) {
        return { content: [{ type: "text", text: `Could not find node with label "${nodeLabel}"` }] };
      }

      await node.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("Delete");
      await page.waitForTimeout(500);

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Removed node "${nodeLabel}"` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_get_canvas_state",
    "Analyze the current canvas and list all visible nodes with their positions",
    {},
    async () => {
      const page = await getPage();

      const nodes = await page.evaluate(() => {
        const results = [];
        // Look for node elements on the canvas
        const selectors = [
          '[class*="node"]',
          '[data-type]',
          '[class*="block"]',
        ];

        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = el.textContent?.trim()?.substring(0, 80);
            const rect = el.getBoundingClientRect();
            if (text && rect.width > 50 && rect.height > 30) {
              results.push({
                label: text,
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
        }
        return results;
      });

      const img = await screenshot();
      const text = nodes.length > 0
        ? `Found ${nodes.length} nodes:\n${nodes.map((n) => `- "${n.label}" at (${n.x}, ${n.y}) [${n.width}x${n.height}]`).join("\n")}`
        : "No nodes detected on canvas.";

      return {
        content: [
          { type: "text", text },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );
}
