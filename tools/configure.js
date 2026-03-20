import { z } from "zod";
import { getPage, screenshot } from "../browser.js";

export function register(server) {
  server.tool(
    "weavy_set_prompt",
    "Type text into a Prompt node on the canvas",
    {
      nodeLabel: z.string().optional().describe("Label of the Prompt node to target (if multiple prompts exist)"),
      text: z.string().describe("The prompt text to enter"),
      append: z.boolean().optional().describe("Append to existing text instead of replacing"),
    },
    async ({ nodeLabel, text, append }) => {
      const page = await getPage();

      // If a specific node label is provided, click it first
      if (nodeLabel) {
        const node = await page.$(`text="${nodeLabel}"`);
        if (node) {
          await node.click();
          await page.waitForTimeout(300);
        }
      }

      // Find the text area in the selected/focused node or properties panel
      const textArea = await page.$(
        'textarea, [contenteditable="true"], [class*="prompt"] textarea, [class*="prompt"] [contenteditable]'
      );

      if (!textArea) {
        const img = await screenshot();
        return {
          content: [
            { type: "text", text: "Could not find a text input area. Make sure a Prompt node is selected." },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      if (!append) {
        await textArea.fill("");
      }
      await textArea.fill(append ? (await textArea.inputValue()) + text : text);
      await page.waitForTimeout(300);

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Set prompt text (${text.length} chars)` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_configure_node",
    "Configure a node's parameters in the properties panel (aspect ratio, model settings, etc.)",
    {
      nodeLabel: z.string().describe("Label of the node to configure"),
      parameter: z.string().describe("Parameter name/label to change (e.g., 'Aspect Ratio', 'Prompt Adherence')"),
      value: z.string().describe("Value to set (for dropdowns, the option text; for sliders, a number; for toggles, 'true'/'false')"),
    },
    async ({ nodeLabel, parameter, value }) => {
      const page = await getPage();

      // Click the node to select it and open properties panel
      const node = await page.$(`text="${nodeLabel}"`);
      if (node) {
        await node.click();
        await page.waitForTimeout(500);
      }

      // Find the parameter label in the properties panel
      const paramLabel = await page.$(`text="${parameter}"`);
      if (!paramLabel) {
        const img = await screenshot();
        return {
          content: [
            { type: "text", text: `Could not find parameter "${parameter}". Screenshot:` },
            { type: "image", data: img, mimeType: "image/png" },
          ],
        };
      }

      // Find the input/select near the parameter label
      const parent = await paramLabel.evaluateHandle((el) => el.closest("[class*='param'], [class*='property'], [class*='field'], div") || el.parentElement);
      const input = await parent.$("input, select, [role='combobox'], [role='slider'], [role='listbox']");

      if (input) {
        const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
        if (tagName === "select") {
          await input.selectOption({ label: value });
        } else if (tagName === "input") {
          const inputType = await input.getAttribute("type");
          if (inputType === "checkbox") {
            const checked = await input.isChecked();
            if ((value === "true" && !checked) || (value === "false" && checked)) {
              await input.click();
            }
          } else if (inputType === "range") {
            await input.fill(value);
          } else {
            await input.fill(value);
          }
        } else {
          // Combobox or custom dropdown — click to open, then select value
          await input.click();
          await page.waitForTimeout(300);
          const option = await page.$(`[role="option"]:has-text("${value}"), text="${value}"`);
          if (option) await option.click();
        }
      } else {
        // Try clicking the label area and look for options
        await paramLabel.click();
        await page.waitForTimeout(300);
        const option = await page.$(`text="${value}"`);
        if (option) await option.click();
      }

      await page.waitForTimeout(300);
      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Set "${parameter}" to "${value}" on node "${nodeLabel}"` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );

  server.tool(
    "weavy_import_file",
    "Upload a file through an Import node",
    {
      filePath: z.string().describe("Local file path to upload"),
      nodeLabel: z.string().optional().describe("Label of the Import node (if multiple exist)"),
    },
    async ({ filePath, nodeLabel }) => {
      const page = await getPage();

      // Click the import node if specified
      if (nodeLabel) {
        const node = await page.$(`text="${nodeLabel}"`);
        if (node) {
          await node.click();
          await page.waitForTimeout(500);
        }
      }

      // Find file input and upload
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(filePath);
        await page.waitForTimeout(2000);
      } else {
        // Try clicking the import node body to trigger upload dialog
        const importNode = await page.$('[class*="import"], text="Import"');
        if (importNode) {
          const [fileChooser] = await Promise.all([
            page.waitForEvent("filechooser", { timeout: 5000 }).catch(() => null),
            importNode.click(),
          ]);
          if (fileChooser) {
            await fileChooser.setFiles(filePath);
            await page.waitForTimeout(2000);
          }
        }
      }

      const img = await screenshot();
      return {
        content: [
          { type: "text", text: `Imported file: ${filePath}` },
          { type: "image", data: img, mimeType: "image/png" },
        ],
      };
    }
  );
}
