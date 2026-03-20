import { z } from "zod";
import { getPage, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_create_app",
    "Create a Design App from the current workflow by adding an Output node, connecting it, and publishing",
    {
      sourceNode: z.string().describe("Label of the final result node to connect the Output node to"),
    },
    async ({ sourceNode }) => {
      const page = await getPage();

      // First, add an Output node
      const viewport = page.viewportSize();

      // Right-click to open node menu
      await page.mouse.click(viewport.width - 300, viewport.height / 2, { button: "right" });
      await page.waitForTimeout(500);

      // Search for Output node
      const searchInput = await page.$(
        'input[type="text"], input[type="search"], input[placeholder*="search" i]'
      );
      if (searchInput) {
        await searchInput.fill("Output");
        await page.waitForTimeout(500);

        const result = await page.$('text="Output"');
        if (result) {
          await result.click();
          await page.waitForTimeout(500);
        }
      }

      // Now connect the source node to the Output node
      // (Similar logic to connect_nodes but we know Output was just created at a specific spot)
      const sourceEl = await page.$(`text="${sourceNode}"`);
      const outputEl = await page.$('text="Output"');

      if (sourceEl && outputEl) {
        const sourceBox = await sourceEl.boundingBox();
        const outputBox = await outputEl.boundingBox();

        if (sourceBox && outputBox) {
          // Drag from source output to Output input
          const sx = sourceBox.x + sourceBox.width + 10;
          const sy = sourceBox.y + sourceBox.height / 2;
          const tx = outputBox.x - 10;
          const ty = outputBox.y + outputBox.height / 2;

          await page.mouse.move(sx, sy);
          await page.mouse.down();
          for (let i = 1; i <= 10; i++) {
            await page.mouse.move(sx + (tx - sx) * (i / 10), sy + (ty - sy) * (i / 10));
            await page.waitForTimeout(30);
          }
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }

      // Switch to App tab
      const appTab = await page.$('text="App", [class*="app-tab"]');
      if (appTab) {
        await appTab.click();
        await page.waitForTimeout(1000);

        // Click Publish
        const publishBtn = await page.$('button:has-text("Publish"), text="Publish"');
        if (publishBtn) {
          await publishBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      const img = await screenshot();
      const currentUrl = page.url();
      return {
        content: [
          { type: "text", text: `Design App created from "${sourceNode}". URL: ${currentUrl}` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );
}
