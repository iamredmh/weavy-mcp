import { chromium } from "playwright";
import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";

const WEAVY_URL = "https://app.weavy.ai";
const USER_DATA_DIR = join(homedir(), ".claude", "mcp-servers", "weavy-mcp", ".browser-data");

let browser = null;
let context = null;
let page = null;

export async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  browser = context.browser();
  page = context.pages()[0] || (await context.newPage());

  return browser;
}

export async function getPage() {
  if (!context) await getBrowser();
  if (!page || page.isClosed()) {
    page = context.pages()[0] || (await context.newPage());
  }
  return page;
}

export async function navigateToWeavy() {
  const p = await getPage();
  const currentUrl = p.url();

  if (!currentUrl.startsWith(WEAVY_URL)) {
    await p.goto(WEAVY_URL, { waitUntil: "networkidle", timeout: 30000 });
  }

  return p;
}

export async function ensureLoggedIn() {
  const p = await navigateToWeavy();

  // Check if we're on a login/auth page or the dashboard
  const url = p.url();
  if (url.includes("login") || url.includes("auth") || url.includes("sign")) {
    return {
      loggedIn: false,
      message:
        "Not logged in to Weavy. Please log in manually in the browser window that opened, then retry.",
    };
  }

  return { loggedIn: true };
}

export async function ensureOnCanvas(projectUrl) {
  const p = await getPage();
  if (projectUrl && !p.url().includes(projectUrl)) {
    await p.goto(projectUrl, { waitUntil: "networkidle", timeout: 30000 });
  }
  // Wait for canvas to be ready
  await p.waitForTimeout(1000);
  return p;
}

export async function screenshot() {
  const p = await getPage();
  const buffer = await p.screenshot({ type: "png" });
  return buffer.toString("base64");
}

export async function closeBrowser() {
  if (context) {
    await context.close();
    context = null;
    browser = null;
    page = null;
  }
}
