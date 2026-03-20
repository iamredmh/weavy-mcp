import { z } from "zod";
import { navigateToWeavy, getPage, ensureLoggedIn, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_list_projects",
    "List all available Weavy projects/flows from the dashboard",
    {},
    async () => {
      const status = await ensureLoggedIn();
      if (!status.loggedIn) {
        return { content: [{ type: "text", text: status.message }] };
      }

      const page = await navigateToWeavy();

      // Navigate to dashboard/home to see projects
      await page.goto("https://app.weavy.ai", { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Look for project cards/links on the dashboard
      const projects = await page.evaluate(() => {
        const items = [];
        // Try common selectors for project listings
        const selectors = [
          '[data-testid*="project"]',
          '[class*="project"]',
          '[class*="flow"]',
          'a[href*="/flow/"]',
          '[class*="card"]',
        ];

        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const name = el.textContent?.trim()?.substring(0, 100);
            const href = el.href || el.querySelector("a")?.href || "";
            if (name && !items.find((i) => i.name === name)) {
              items.push({ name, url: href });
            }
          }
        }
        return items;
      });

      if (projects.length === 0) {
        const img = await screenshot();
        return {
          content: [
            { type: "text", text: "Could not find project listings. Here's what the page looks like:" },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      const text = projects.map((p, i) => `${i + 1}. ${p.name}${p.url ? ` — ${p.url}` : ""}`).join("\n");
      return { content: [{ type: "text", text: `Found ${projects.length} projects:\n${text}` }] };
    }
  );

  server.tool(
    "weavy_open_project",
    "Open an existing Weavy project by URL or create a new one",
    {
      url: z.string().optional().describe("Full URL of the project (e.g., https://app.weavy.ai/flow/abc123)"),
      createNew: z.boolean().optional().describe("Set to true to create a new project instead"),
      name: z.string().optional().describe("Name for the new project"),
    },
    async ({ url, createNew, name }) => {
      const status = await ensureLoggedIn();
      if (!status.loggedIn) {
        return { content: [{ type: "text", text: status.message }] };
      }

      const page = await getPage();

      if (createNew) {
        // Navigate to dashboard and look for "New" or "Create" button
        await page.goto("https://app.weavy.ai", { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(2000);

        // Look for create/new flow button
        const createBtn = await page.$('button:has-text("New"), button:has-text("Create"), [class*="create"], [class*="new-flow"]');
        if (createBtn) {
          await createBtn.click();
          await page.waitForTimeout(2000);
        }

        const img = await screenshot();
        return {
          content: [
            { type: "text", text: `Created new project${name ? ` "${name}"` : ""}. Current state:` },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      if (url) {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(2000);

        const img = await screenshot();
        return {
          content: [
            { type: "text", text: `Opened project: ${url}` },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      return { content: [{ type: "text", text: "Provide either a URL to open or set createNew=true." }] };
    }
  );

  server.tool(
    "weavy_screenshot",
    "Take a screenshot of the current Weavy canvas state",
    {},
    async () => {
      const img = await screenshot();
      return {
        content: [{ type: "image", data: img, mimeType: "image/png" }],
      };
    }
  );
}
