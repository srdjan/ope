import { type Browser, chromium, type Page } from "npm:playwright-core";

type Viewport = { readonly width: number; readonly height: number };

const VIEWPORTS: ReadonlyArray<
  { readonly name: string; readonly vp: Viewport }
> = [
  { name: "desktop-1366x768", vp: { width: 1366, height: 768 } },
  { name: "mobile-360x640", vp: { width: 360, height: 640 } },
  { name: "mobile-390x844", vp: { width: 390, height: 844 } },
];

function pickChromeExecutablePath(): string {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const path of candidates) {
    try {
      const stat = Deno.statSync(path);
      if (stat.isFile) return path;
    } catch {
      // continue
    }
  }
  throw new Error(
    "No Chromium-based browser found at expected macOS paths. Install Chrome or update scripts/ui_smoke.ts.",
  );
}

async function waitForHealthy(baseUrl: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(1_500),
      });
      if (res.ok && (await res.text()) === "ok") return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not become healthy: ${String(lastErr)}`);
}

async function screenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: false });
}

async function assertNoHorizontalScroll(page: Page, label: string) {
  const ok = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.ceil(doc.scrollWidth) <= window.innerWidth + 1;
  });
  if (!ok) throw new Error(`${label}: horizontal scrolling detected`);
}

async function assertNoVerticalScroll(page: Page, label: string) {
  const ok = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const docScroll = Math.ceil(doc.scrollHeight);
    const bodyScroll = Math.ceil(body ? body.scrollHeight : 0);
    const maxScroll = Math.max(docScroll, bodyScroll);
    return maxScroll <= window.innerHeight + 1;
  });
  if (!ok) throw new Error(`${label}: vertical scrolling detected`);
}

async function readClipboard(page: Page): Promise<string> {
  return await page.evaluate(async () => await navigator.clipboard.readText());
}

async function clickTab(page: Page, tabId: string, panelId: string) {
  await page.click(`#${tabId}`);
  await page.waitForFunction(
    ([panelId]) => {
      const el = document.getElementById(panelId);
      return el ? !el.hasAttribute("hidden") : false;
    },
    [panelId],
  );
}

async function getTextareaValue(page: Page, id: string): Promise<string> {
  return await page.$eval(
    `#${id}`,
    (el) => (el as HTMLTextAreaElement).value,
  );
}

async function runForViewport(
  browser: Browser,
  baseUrl: string,
  viewportName: string,
  viewport: Viewport,
) {
  const context = await browser.newContext({
    viewport,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

  await page.waitForSelector("#raw-prompt");
  await page.waitForSelector("#copy-button");
  await page.waitForSelector("#tab-signature");
  await page.waitForSelector("#tab-prompt");
  await page.waitForSelector("#tab-final");
  await page.waitForSelector("#tab-output");

  await assertNoHorizontalScroll(page, `${viewportName}:initial`);
  if (viewportName.startsWith("desktop")) {
    await assertNoVerticalScroll(page, `${viewportName}:initial`);
  }

  await page.fill(
    "#raw-prompt",
    "Summarize the causes of the 2008 financial crisis in ~150 words. Include 2-3 bullet points of key mechanisms.",
  );
  await page.click('#enhance-form button[type="submit"]');

  await page.waitForFunction(() => {
    const out = document.getElementById("enhanced-output") as
      | HTMLTextAreaElement
      | null;
    return !!out && out.value.trim().length > 0;
  });

  await page.waitForFunction(() => {
    const btn = document.getElementById("copy-button") as
      | HTMLButtonElement
      | null;
    return !!btn && btn.disabled === false;
  });

  // Tabs render + layout checks
  await clickTab(page, "tab-signature", "panel-signature");
  await assertNoHorizontalScroll(page, `${viewportName}:signature`);
  if (viewportName.startsWith("desktop")) {
    await assertNoVerticalScroll(page, `${viewportName}:signature`);
  }

  await clickTab(page, "tab-prompt", "panel-prompt");
  await assertNoHorizontalScroll(page, `${viewportName}:prompt`);
  if (viewportName.startsWith("desktop")) {
    await assertNoVerticalScroll(page, `${viewportName}:prompt`);
  }

  await clickTab(page, "tab-final", "panel-final");
  await assertNoHorizontalScroll(page, `${viewportName}:final`);
  if (viewportName.startsWith("desktop")) {
    await assertNoVerticalScroll(page, `${viewportName}:final`);
  }

  await clickTab(page, "tab-output", "panel-output");
  await assertNoHorizontalScroll(page, `${viewportName}:output`);
  if (viewportName.startsWith("desktop")) {
    await assertNoVerticalScroll(page, `${viewportName}:output`);
  }

  // Copy-to-clipboard checks (one per tab)
  for (
    const tab of [
      {
        tabId: "tab-signature",
        panelId: "panel-signature",
        expect: async () => await getTextareaValue(page, "signature-output"),
      },
      {
        tabId: "tab-prompt",
        panelId: "panel-prompt",
        expect: async () => await getTextareaValue(page, "enhanced-output"),
      },
      {
        tabId: "tab-output",
        panelId: "panel-output",
        expect: async () => await getTextareaValue(page, "model-output"),
      },
      {
        tabId: "tab-final",
        panelId: "panel-final",
        expect: async () => {
          const system = await getTextareaValue(page, "final-system-output");
          const user = await getTextareaValue(page, "final-user-output");
          return JSON.stringify(
            {
              messages: [{ role: "system", content: system }, {
                role: "user",
                content: user,
              }],
            },
            null,
            2,
          );
        },
      },
    ]
  ) {
    await clickTab(page, tab.tabId, tab.panelId);
    await page.click("#copy-button");
    await page.waitForTimeout(100);
    const got = await readClipboard(page);
    const expected = await tab.expect();
    if (got !== expected) {
      throw new Error(
        `${viewportName}:${tab.tabId}: clipboard mismatch (expected ${expected.length} chars, got ${got.length} chars)`,
      );
    }
  }

  // Error handling: submit empty prompt by bypassing HTML required attribute
  await page.evaluate(() => {
    const ta = document.getElementById("raw-prompt") as
      | HTMLTextAreaElement
      | null;
    if (!ta) return;
    ta.required = false;
    ta.value = "";
  });
  await page.click('#enhance-form button[type="submit"]');
  await page.waitForFunction(() => {
    const err = document.getElementById("error-message");
    return !!err && !err.hasAttribute("hidden") &&
      (err.textContent ?? "").trim().length > 0;
  });

  const screenshotDir = "docs/screenshots";
  await Deno.mkdir(screenshotDir, { recursive: true });
  await screenshot(page, `${screenshotDir}/${viewportName}-prompt.png`);
  await clickTab(page, "tab-final", "panel-final");
  await screenshot(page, `${screenshotDir}/${viewportName}-final.png`);

  await context.close();
}

async function main() {
  const port = Number(Deno.env.get("OPE_UI_SMOKE_PORT") ?? "8793");
  const baseUrl = `http://127.0.0.1:${port}`;

  const server = new Deno.Command("deno", {
    args: ["task", "dev"],
    env: {
      ...Deno.env.toObject(),
      PORT: String(port),
      MOCK_AI: "true",
    },
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  try {
    await waitForHealthy(baseUrl);

    const executablePath = pickChromeExecutablePath();
    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--disable-dev-shm-usage"],
    });

    try {
      for (const { name, vp } of VIEWPORTS) {
        console.log(`UI smoke: running ${name}…`);
        await runForViewport(browser, baseUrl, name, vp);
        console.log(`UI smoke: ${name} ✅`);
      }
    } finally {
      await browser.close();
    }

    console.log("UI smoke: all viewports ✅");
  } finally {
    try {
      await fetch(`${baseUrl}/shutdown`, { method: "POST" });
    } catch {
      // ignore
    }

    const status = await server.status;
    if (!status.success) {
      const decoder = new TextDecoder();
      const outBytes = await readAll(server.stdout);
      const errBytes = await readAll(server.stderr);
      console.error(decoder.decode(outBytes));
      console.error(decoder.decode(errBytes));
    }
  }
}

if (import.meta.main) {
  await main();
}

async function readAll(
  stream: ReadableStream<Uint8Array> | null,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.byteLength;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}
