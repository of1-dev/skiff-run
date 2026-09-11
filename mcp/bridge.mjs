#!/usr/bin/env node
/**
 * Fold spectator / shared-seat HTTP bridge.
 * Serves the play UI and shares mcp/session/save.json with stdio MCP.
 *
 *   node mcp/bridge.mjs
 *   open http://127.0.0.1:8787/?bridge=1
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";
import { hydrateGame, persistGame, SAVE_PATH } from "./session-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SKIFF_BRIDGE_PORT || 8787);
const HOST = process.env.SKIFF_BRIDGE_HOST || "127.0.0.1";

const game = new SkiffGame();
hydrateGame(game);
game.ensurePrefs();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".ico": "image/x-icon",
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || "/").split("?")[0]);
  const clean = decoded.replace(/^\/+/, "") || "index.html";
  if (clean.includes("\0") || clean.split("/").some((p) => p === "..")) return null;
  const full = path.resolve(root, clean);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function packState() {
  game.ensurePrefs();
  return {
    ok: true,
    version: VERSION,
    ruleset: RULESET,
    savePath: SAVE_PATH,
    state: game.state,
    pendingEncounter: game.pendingEncounter,
    snapshot: game.snapshot(),
  };
}

function runOp(body) {
  const op = body?.op;
  switch (op) {
    case "state": return packState();
    case "ruleset": return { ok: true, ruleset: RULESET, version: VERSION };
    case "new_game": return game.newGame(body.seed);
    case "claim": return game.claim();
    case "release":
    case "take_stick": return game.release();
    case "chart": return game.chart(body.mode || "local");
    case "buy": return game.buy(body.good, body.qty ?? 1);
    case "sell": return game.sell(body.good, body.qty ?? 1);
    case "sell_all": return game.sellAll();
    case "refuel": return game.refuel();
    case "jump": return game.jump(body.system);
    case "encounter": return game.resolveEncounter(body.choice);
    case "buy_ship": return game.buyShip(body.ship);
    case "hire_crew": return game.hireCrew();
    case "fire_crew": return game.fireCrew();
    case "retire": return game.retire();
    case "set_prefs": return game.setPrefs({ autoFuel: body.autoFuel });
    default: return { ok: false, error: "unknown_op", op };
  }
}

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/state" && req.method === "GET") {
    hydrateGame(game);
    game.ensurePrefs();
    return sendJson(res, 200, packState());
  }

  if (url.pathname === "/api/act" && req.method === "POST") {
    hydrateGame(game);
    game.ensurePrefs();
    let body;
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "bad_json", detail: String(e) });
    }
    // Fold bridge acts as the human captain unless explicitly agent.
    game.actorRole = body.actor === "agent" ? "agent" : "human";
    let result;
    try {
      result = runOp(body);
    } finally {
      game.actorRole = "agent";
    }
    persistGame(game);
    // Always return fresh packed state for the Fold client.
    const packed = packState();
    return sendJson(res, 200, { ...packed, result });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end("Method Not Allowed");
  }

  const filePath = safeJoin(ROOT, url.pathname === "/" ? "/index.html" : url.pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      return res.end("Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.error(`Skiff bridge ${VERSION} http://${HOST}:${PORT}/?bridge=1`);
  console.error(`Shared save: ${SAVE_PATH}`);
});
