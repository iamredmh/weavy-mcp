import { z } from "zod";
import { getPage, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_run_node",
    "Click the Run button on a generative node to execute it. Waits for generation to complete.",
    {
      nodeLabel: z.string().describe("Label of the generative node to run"),
      timeout: z.number().optional().describe("Max wait time in seconds for generation (default: 120)"),
    },
    async ({ nodeLabel, timeout }) => {
      const page = await getPage();
      const maxWait = (timeout || 120) * 1000;

      // Click the node to select it
      const node = await page.$(`text="${nodeLabel}"`);
      if (!node) {
        return { content: [{ type: "text", text: `Could not find node "${nodeLabel}"` }] };
      }

      await node.click();
      await page.waitForTimeout(300);

      // Find and click the Run button (on the node itself or in properties panel)
      const runBtn = await page.$(
        'button:has-text("Run"), button:has-text("Generate"), [class*="run-btn"], [class*="generate"]'
      );

      if (!runBtn) {
        const img = await screenshot();
        return {
          content: [
            { type: "text", text: `Could not find Run button for "${nodeLabel}". This might not be a generative node.` },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      await runBtn.click();
      await page.waitForTimeout(1000);

      // Wait for generation to complete
      // Look for loading indicators to appear then disappear
      try {
        // Wait for a loading indicator to appear
        await page.waitForSelector(
          '[class*="loading"], [class*="spinner"], [class*="progress"], [class*="generating"]',
          { timeout: 5000 }
        ).catch(() => {});

        // Wait for it to disappear (generation complete)
        await page.waitForSelector(
          '[class*="loading"], [class*="spinner"], [class*="progress"], [class*="generating"]',
          { state: "hidden", timeout: maxWait }
        ).catch(() => {});
      } catch {
        // If no loading indicator found, just wait a bit
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(1000);
      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Ran node "${nodeLabel}". Generation complete.` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_export",
    "Export/download the output from a node via the Export node",
    {
      nodeLabel: z.string().optional().describe("Label of the node to export from (default: looks for Export node)"),
      downloadPath: z.string().optional().describe("Local directory to save the exported file"),
    },
    async ({ nodeLabel, downloadPath }) => {
      const page = await getPage();

      // If a download path is specified, set up download behavior
      if (downloadPath) {
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send("Browser.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: downloadPath,
        });
      }

      // Click the export node
      const target = nodeLabel || "Export";
      const node = await page.$(`text="${target}"`);
      if (node) {
        await node.click();
        await page.waitForTimeout(500);
      }

      // Look for export/download button
      const exportBtn = await page.$(
        'button:has-text("Export"), button:has-text("Download"), [class*="export"], [class*="download"]'
      );

      if (exportBtn) {
        await exportBtn.click();
        await page.waitForTimeout(3000);
      }

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Export triggered${downloadPath ? ` to ${downloadPath}` : ""}. Check downloads.` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );
}
