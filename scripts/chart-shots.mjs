#!/usr/bin/env node
/**
 * Headless Chart shots (Playwright / Chromium).
 * Run via scripts/chart-shots.sh so browsers come from the Podman image.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const URL = process.env.SKIFF_SHOT_URL || "https://of1-dev.github.io/skiff-run/";
const OUT = process.env.SKIFF_SHOT_DIR || "tmp";
const W = Number(process.env.SKIFF_SHOT_W || 1100);
const H = Number(process.env.SKIFF_SHOT_H || 900);

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

const chartTab = page.locator('.tab[data-tab="chart"]');
await chartTab.click();
await page.locator("#map").waitFor({ state: "visible" });

async function shot(mode) {
  await page.locator("#mode-" + mode).click();
  await page.waitForTimeout(400);
  const dest = path.join(OUT, "chart-" + mode + ".png");
  await page.locator("#map").screenshot({ path: dest });
  console.log("wrote", dest);
}

await shot("local");
await shot("sector");
await shot("full");

const fullPage = path.join(OUT, "chart-fullpage.png");
await page.screenshot({ path: fullPage, fullPage: false });
console.log("wrote", fullPage);

await browser.close();
