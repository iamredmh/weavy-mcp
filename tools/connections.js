import { z } from "zod";
import { getPage, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_connect_nodes",
    "Connect two nodes by dragging from the output handle of one to the input handle of another. Handles are the colored dots on the sides of nodes (outputs on right, inputs on left).",
    {
      sourceNode: z.string().describe("Label/name of the source node (output side)"),
      targetNode: z.string().describe("Label/name of the target node (input side)"),
      sourceOutput: z.string().optional().describe("Specific output handle name if multiple exist"),
      targetInput: z.string().optional().describe("Specific input handle name if multiple exist"),
    },
    async ({ sourceNode, targetNode, sourceOutput, targetInput }) => {
      const page = await getPage();

      // Find the source node element
      const sourceEl = await page.$(`text="${sourceNode}"`);
      if (!sourceEl) {
        return { content: [{ type: "text", text: `Could not find source node "${sourceNode}"` }] };
      }

      // Find the target node element
      const targetEl = await page.$(`text="${targetNode}"`);
      if (!targetEl) {
        return { content: [{ type: "text", text: `Could not find target node "${targetNode}"` }] };
      }

      // Get positions of both nodes
      const sourceBox = await sourceEl.boundingBox();
      const targetBox = await targetEl.boundingBox();

      if (!sourceBox || !targetBox) {
        return { content: [{ type: "text", text: "Could not determine node positions." }] };
      }

      // Output handle is on the right side of the source node
      const sourceHandleX = sourceBox.x + sourceBox.width + 10;
      const sourceHandleY = sourceBox.y + sourceBox.height / 2;

      // Input handle is on the left side of the target node
      const targetHandleX = targetBox.x - 10;
      const targetHandleY = targetBox.y + targetBox.height / 2;

      // If specific handles are named, try to find them
      if (sourceOutput) {
        const handleEl = await page.$(`text="${sourceOutput}"`);
        if (handleEl) {
          const hBox = await handleEl.boundingBox();
          if (hBox) {
            // Use position near this handle label
            await page.mouse.move(hBox.x + hBox.width + 5, hBox.y + hBox.height / 2);
          }
        }
      }

      // Perform the drag from source output to target input
      await page.mouse.move(sourceHandleX, sourceHandleY);
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(100);

      // Drag to target with intermediate steps for smoother motion
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const midX = sourceHandleX + (targetHandleX - sourceHandleX) * t;
        const midY = sourceHandleY + (targetHandleY - sourceHandleY) * t;
        await page.mouse.move(midX, midY);
        await page.waitForTimeout(50);
      }

      await page.mouse.up();
      await page.waitForTimeout(500);

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Connected "${sourceNode}" → "${targetNode}"` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_disconnect_nodes",
    "Disconnect two nodes by right-clicking the connection line",
    {
      sourceNode: z.string().describe("Label of the source node"),
      targetNode: z.string().describe("Label of the target node"),
    },
    async ({ sourceNode, targetNode }) => {
      const page = await getPage();

      // Find both nodes to locate the connection line between them
      const sourceEl = await page.$(`text="${sourceNode}"`);
      const targetEl = await page.$(`text="${targetNode}"`);

      if (!sourceEl || !targetEl) {
        return { content: [{ type: "text", text: "Could not find one or both nodes." }] };
      }

      const sourceBox = await sourceEl.boundingBox();
      const targetBox = await targetEl.boundingBox();

      // Click roughly at the midpoint of where the connection line would be
      const midX = (sourceBox.x + sourceBox.width + targetBox.x) / 2;
      const midY = (sourceBox.y + sourceBox.height / 2 + targetBox.y + targetBox.height / 2) / 2;

      await page.mouse.click(midX, midY, { button: "right" });
      await page.waitForTimeout(500);

      // Look for disconnect/delete option in context menu
      const deleteOption = await page.$(
        'text="Delete", text="Disconnect", text="Remove", [class*="delete"], [class*="disconnect"]'
      );
      if (deleteOption) {
        await deleteOption.click();
        await page.waitForTimeout(500);
      }

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Attempted to disconnect "${sourceNode}" from "${targetNode}"` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );
}
