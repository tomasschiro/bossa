import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:3000/ritmistas/carnaval", { waitUntil: "networkidle" });
await page.click("text=Modo oscuro");
await page.waitForTimeout(300);
await page.screenshot({ path: "/private/tmp/claude-501/-Users-tomasschiro-Documents-Bossa/925b17b3-271f-4180-8368-608adebcee08/scratchpad/dark-carnaval.png", fullPage: true });

await page.click("text=Martina Paredes");
await page.waitForTimeout(300);
await page.screenshot({ path: "/private/tmp/claude-501/-Users-tomasschiro-Documents-Bossa/925b17b3-271f-4180-8368-608adebcee08/scratchpad/dark-ficha.png", fullPage: true });

await browser.close();
