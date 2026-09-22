#!/usr/bin/env node
/**
 * Fold spectator static web server + session bridge.
 * Serves the play UI with WebMCP tools so Fold and agents can run over local network/Tailscale.
 *
 *   node mcp/bridge.mjs
 *   open http://127.0.0.1:8787/
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SKIFF_BRIDGE_PORT || 8787);
const HOST = process.env.SKIFF_BRIDGE_HOST || "127.0.0.1";
const SAVE_PATH = path.join(__dirname, "session", "save.json");

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

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readSave() {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      return JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
    }
  } catch (_) {}
  return null;
}

function writeSave(data) {
  try {
    fs.mkdirSync(path.dirname(SAVE_PATH), { recursive: true });
    fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (_) {
    return false;
  }
}

function makeSnapshot(state) {
  if (!state) return null;
  const cargoUsed = Object.values(state.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
  return {
    system: state.system,
    credits: state.credits || 0,
    fuel: state.fuel || 0,
    fuelMax: 14,
    cargo: state.cargo || {},
    cargoUsed: cargoUsed,
    cargoMax: 20,
    ship: { id: state.shipId || "unbowed", cargo: 20, fuelMax: 14, range: 14, weapons: false },
    canRetire: state.system === "quiet" && (state.credits || 0) >= 35000,
    prices: state.prices || {},
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/state" && req.method === "GET") {
    const saved = readSave();
    const st = saved ? (saved.state || saved) : null;
    return sendJson(res, 200, {
      ok: true,
      state: st,
      snapshot: makeSnapshot(st),
      pendingEncounter: saved ? saved.pendingEncounter : null,
    });
  }

  if (url.pathname === "/api/act" && req.method === "POST") {
    let body = {};
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (_) {}

    const saved = readSave() || { state: {} };
    const st = saved.state || saved;
    const op = body.op;
    let result = { ok: true };

    if (op === "claim") {
      st.pilot = "agent";
      result = { ok: true, pilot: "agent" };
    } else if (op === "take_stick" || op === "release") {
      st.pilot = "human";
      result = { ok: true, pilot: "human" };
    } else if (op === "dock_work") {
      if (st.dockWorkAt === st.system) {
        result = { ok: false, reason: "already", error: "Already worked this stay" };
      } else {
        st.dockWorkAt = st.system;
        st.credits = (st.credits || 0) + 400;
        result = { ok: true, pay: 400 };
      }
    } else if (op === "buy_press") {
      if (st.pressBoughtAt === st.system) {
        result = { ok: false, reason: "already" };
      } else {
        st.pressBoughtAt = st.system;
        st.credits = Math.max(0, (st.credits || 0) - 75);
        st.quests = st.quests || [];
        
        let questMsg = "Bought the Press.";
        if (Math.random() < 0.6 && st.chart && st.chart.pos) {
          const sysKeys = Object.keys(st.chart.pos).filter(k => k !== st.system);
          if (sysKeys.length > 0) {
            const dest = sysKeys[Math.floor(Math.random() * sysKeys.length)];
            const isBounty = Math.random() < 0.5;
            const reward = isBounty ? 8000 : 5000;
            const title = isBounty ? `Bounty: Pirate Lord at ${dest}` : `Delivery: Medical Supplies to ${dest}`;
            st.quests.push({ id: Date.now().toString(), dest, title, reward });
            questMsg = `Bought the Press. Found a new lead: ${title} (₩${reward})`;
          }
        }
        result = { ok: true, log: questMsg };
      }
    } else if (op === "refuel") {
      st.fuel = 14;
      st.credits = Math.max(0, (st.credits || 0) - 45);
      result = { ok: true, fuel: 14 };
    } else if (op === "repair") {
      st.hull = 150;
      st.credits = Math.max(0, (st.credits || 0) - 100);
      result = { ok: true, hull: 150 };
    } else if (op === "rearm") {
      st.ammo = 50;
      st.credits = Math.max(0, (st.credits || 0) - 100);
      result = { ok: true, ammo: 50 };
    } else if (op === "jump") {
      st.system = body.system || st.system;
      st.fuel = Math.max(0, (st.fuel || 14) - 1);
      st.dockWorkAt = null;
      st.pressBoughtAt = null;
      
      let jumpLog = `Jumped to ${st.system}.`;
      
      // Resolve quests
      st.quests = st.quests || [];
      const completed = st.quests.filter(q => q.dest === st.system);
      st.quests = st.quests.filter(q => q.dest !== st.system);
      
      if (completed.length > 0) {
        const totalReward = completed.reduce((sum, q) => sum + q.reward, 0);
        st.credits = (st.credits || 0) + totalReward;
        jumpLog += ` Completed ${completed.length} quest(s) for ₩${totalReward}!`;
      }
      
      result = { ok: true, system: st.system, log: jumpLog };
    } else if (op === "sell_all" || op === "sell_expensive") {
      const units = Object.values(st.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
      if (units > 0) {
        st.cargo = { ore: 0, grain: 0, optics: 0, meds: 0, spice: 0, scrap: 0 };
        st.credits = (st.credits || 0) + (units * 40);
        result = { ok: true, unitsSold: units, log: `Sold ${units} units` };
      } else {
        result = { ok: false, log: "Hold empty" };
      }
    } else if (op === "fill_cheap") {
      const shipMaxCargo = {
        "mite": 10, "skiff-7": 20, "glass-dart": 12, "tide-runner": 24,
        "knot-hauler": 32, "hold-barge": 40, "ember-cutter": 16, "ash-lance": 14,
        "quiet-ark": 50, "wasp-prime": 18, "unbowed": 12
      };
      const maxCargo = shipMaxCargo[st.shipId || "skiff-7"] || 10;
      const units = Object.values(st.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
      const room = maxCargo - units;
      
      if (room > 0 && st.credits >= 15) {
        const canAfford = Math.min(room, Math.floor(st.credits / 15));
        st.cargo = st.cargo || {};
        st.cargo.ore = (st.cargo.ore || 0) + canAfford;
        st.credits -= canAfford * 15;
        result = { ok: true, unitsLoaded: canAfford, log: `Filled cheap: ${canAfford} Basalt Ore` };
      } else {
        result = { ok: false, log: "Nothing cheap or no space" };
      }
    } else if (op === "encounter") {
      saved.pendingEncounter = null;
      result = { ok: true };
    } else if (op === "retire") {
      result = { ok: true, retired: true };
    }

    if (op && (st.pilot === "agent" || body.actor === "agent")) {
      const entry = {
        t: Date.now(),
        op: op,
        summary: `${op}: ${result.log || (result.ok ? "ok" : result.reason || "failed")}`,
      };
      st.agentLog = Array.isArray(st.agentLog) ? st.agentLog : [];
      st.agentLog.push(entry);
      if (st.agentLog.length > 40) st.agentLog = st.agentLog.slice(-40);
    }

    saved.state = st;
    writeSave(saved);

    return sendJson(res, 200, {
      ok: true,
      state: st,
      snapshot: makeSnapshot(st),
      pendingEncounter: saved.pendingEncounter || null,
      result: result,
    });
  }

  if (url.pathname === "/api/save" && req.method === "POST") {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      writeSave(body);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "bad_json" });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end("Method Not Allowed");
  }

  if (url.pathname === "/") {
    if (!url.searchParams.has("bridge")) {
      res.writeHead(302, { Location: "/?bridge=1" });
      return res.end();
    }
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
  console.error(`Skiff bridge server http://${HOST}:${PORT}/`);
  console.error(`WebMCP active in browser session`);
});
