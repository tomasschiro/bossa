import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
await page.goto("http://localhost:3000/ritmistas/carnaval", { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const aside = await page.$("aside");
await aside.screenshot({ path: "/private/tmp/claude-501/-Users-tomasschiro-Documents-Bossa/925b17b3-271f-4180-8368-608adebcee08/scratchpad/sidebar-only.png" });
await browser.close();
