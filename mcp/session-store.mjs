/** Shared MCP / bridge save path — one captain, one file. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SAVE_PATH = path.join(__dirname, "session", "save.json");
export const INBOX_PATH = path.join(__dirname, "session", "inbox.json");

export function hydrateGame(game) {
  try {
    if (!fs.existsSync(SAVE_PATH)) return false;
    const raw = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
    if (!raw?.state) return false;
    game.state = raw.state;
    if (raw.chart) game.applyChart(raw.chart);
    else if (raw.state.chart) game.applyChart(raw.state.chart);
    game.pendingEncounter = raw.pendingEncounter || null;
    game.ensurePrefs?.();
    return true;
  } catch (_) {
    return false;
  }
}

export function persistGame(game) {
  fs.mkdirSync(path.dirname(SAVE_PATH), { recursive: true });
  fs.writeFileSync(SAVE_PATH, JSON.stringify({
    state: game.state,
    chart: game.state?.chart,
    pendingEncounter: game.pendingEncounter,
  }, null, 2));
}
