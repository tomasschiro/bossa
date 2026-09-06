import { chromium } from "playwright";

const url = process.argv[2];
const outPath = process.argv[3];
const clicks = process.argv.slice(4);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle" });
for (const sel of clicks) {
  await page.click(sel);
  await page.waitForTimeout(300);
}
await page.waitForTimeout(300);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
