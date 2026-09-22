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

// Parse ship stats directly from game.js — single source of truth.
// Extracts the SHIPS array so bridge never holds a stale copy.
function loadShipStats() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
    // Match each ship object literal in the SHIPS array
    const re = /\{\s*id:\s*"([^"]+)"[^}]*cargo:\s*(\d+)[^}]*fuelMax:\s*(\d+)[^}]*range:\s*(\d+)[^}]*weapons:\s*(true|false)[^}]*crewMax:\s*(\d+)[^}]*hullMax:\s*(\d+)[^}]*ammoMax:\s*(\d+)[^}]*price:\s*(\d+)/g;
    const table = {};
    let m;
    while ((m = re.exec(src)) !== null) {
      table[m[1]] = {
        cargo: +m[2], fuelMax: +m[3], range: +m[4],
        weapons: m[5] === "true", crewMax: +m[6],
        hullMax: +m[7], ammoMax: +m[8], price: +m[9],
      };
    }
    if (Object.keys(table).length === 0) {
      console.error("[bridge] WARNING: parsed 0 ships from game.js, falling back");
      return null;
    }
    console.error(`[bridge] Loaded ${Object.keys(table).length} ships from game.js`);
    return table;
  } catch (e) {
    console.error("[bridge] Could not read game.js for ship stats:", e.message);
    return null;
  }
}

const SHIP_STATS = loadShipStats() || {
  // Last-resort fallback — should never be reached if game.js exists
  "skiff-7": { cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, hullMax: 40, ammoMax: 0, price: 0 },
};

function shipFor(id) {
  return SHIP_STATS[id] || SHIP_STATS["skiff-7"];
}

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
  } catch (e) {
    console.error("[bridge] readSave failed:", e.message);
  }
  return null;
}

function writeSave(data) {
  try {
    fs.mkdirSync(path.dirname(SAVE_PATH), { recursive: true });
    fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[bridge] writeSave failed:", e.message);
    return false;
  }
}

function makeSnapshot(state) {
  if (!state) return null;
  const s = shipFor(state.shipId);
  const cargoUsed = Object.values(state.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
  return {
    system: state.system,
    systemName: state.systemName || state.system,
    credits: state.credits || 0,
    fuel: state.fuel || 0,
    fuelMax: s.fuelMax,
    hull: state.hull || 0,
    hullMax: s.hullMax,
    ammo: state.ammo || 0,
    ammoMax: s.ammoMax,
    cargo: state.cargo || {},
    cargoUsed: cargoUsed,
    cargoMax: s.cargo,
    ship: { id: state.shipId || "skiff-7", cargo: s.cargo, fuelMax: s.fuelMax, range: s.range, weapons: s.weapons },
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
    } catch (e) {
      console.error("[bridge] act body parse failed:", e.message);
    }

    const saved = readSave() || { state: {} };
    const st = saved.state || saved;
    const op = body.op;
    let result = { ok: true };

    if (op === "save" && body.state) {
      // Browser pushing authoritative state after withLocalEval
      saved.state = body.state;
      writeSave(saved);
      return sendJson(res, 200, { ok: true, state: saved.state, snapshot: makeSnapshot(saved.state) });
    } else if (op === "claim") {
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
      const ss = shipFor(st.shipId);
      const need = ss.fuelMax - (st.fuel || 0);
      if (need > 0 && st.credits >= 5) {
        const canAfford = Math.min(need, Math.floor(st.credits / 5));
        st.fuel = (st.fuel || 0) + canAfford;
        st.credits -= canAfford * 5;
        result = { ok: true, fuel: st.fuel };
      } else {
        result = { ok: false, log: "Tanks full or no credits" };
      }
    } else if (op === "repair") {
      const ss = shipFor(st.shipId);
      const need = ss.hullMax - (st.hull || 0);
      if (need > 0 && st.credits >= 20) {
        const canAfford = Math.min(need, Math.floor(st.credits / 20));
        st.hull = (st.hull || 0) + canAfford;
        st.credits -= canAfford * 20;
        result = { ok: true, hull: st.hull };
      } else {
        result = { ok: false, log: "Hull intact or no credits" };
      }
    } else if (op === "rearm") {
      const ss = shipFor(st.shipId);
      if (!ss.ammoMax) {
        result = { ok: false, log: "Ship has no weapon mounts" };
      } else {
        const need = ss.ammoMax - (st.ammo || 0);
        if (need > 0 && st.credits >= 50) {
          const canAfford = Math.min(need, Math.floor(st.credits / 50));
          st.ammo = (st.ammo || 0) + canAfford;
          st.credits -= canAfford * 50;
          result = { ok: true, ammo: st.ammo };
        } else {
          result = { ok: false, log: "Ammo full or no credits" };
        }
      }
    } else if (op === "jump") {
      const ss = shipFor(st.shipId);
      st.system = body.system || st.system;
      st.fuel = Math.max(0, (st.fuel || ss.fuelMax) - 1);
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
      const ss = shipFor(st.shipId);
      const units = Object.values(st.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
      const room = ss.cargo - units;
      
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
