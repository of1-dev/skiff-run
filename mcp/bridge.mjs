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

// Parse ship stats from Fold SoT js/data/ships.js (game.js no longer inlines SHIPS).
function loadShipStats() {
  const candidates = [
    path.join(ROOT, "js/data/ships.js"),
    path.join(ROOT, "game.js"),
  ];
  const re = /\{\s*id:\s*"([^"]+)"[^}]*cargo:\s*(\d+)[^}]*fuelMax:\s*(\d+)[^}]*range:\s*(\d+)[^}]*weapons:\s*(true|false)[^}]*crewMax:\s*(\d+)[^}]*hullMax:\s*(\d+)[^}]*ammoMax:\s*(\d+)[^}]*price:\s*(\d+)/g;
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, "utf8");
      const table = {};
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(src)) !== null) {
        table[m[1]] = {
          cargo: +m[2], fuelMax: +m[3], range: +m[4],
          weapons: m[5] === "true", crewMax: +m[6],
          hullMax: +m[7], ammoMax: +m[8], price: +m[9],
        };
      }
      if (Object.keys(table).length === 0) continue;
      console.error(`[bridge] Loaded ${Object.keys(table).length} ships from ${path.relative(ROOT, file)}`);
      return table;
    } catch (e) {
      console.error("[bridge] Could not read ship stats from", file, e.message);
    }
  }
  console.error("[bridge] WARNING: parsed 0 ships, falling back");
  return null;
}

const SHIP_STATS = loadShipStats() || {
  // Last-resort fallback — should never be reached if game.js exists
  "skiff-7": { cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, hullMax: 40, ammoMax: 0, price: 0 },
};

function shipFor(id) {
  return SHIP_STATS[id] || SHIP_STATS["skiff-7"] || { cargo: 20, fuelMax: 14, crewMax: 1, hullMax: 40, ammoMax: 0, price: 0 };
}

/** Peak Unbowed crew — match Fold js/debug-god.js / engine PEAK_UNBOWED_CREW. */
const PEAK_UNBOWED_CREW = [
  { role: "helm", quirk: "steady hands", pilot: 9, fighter: 3, trader: 2, engineer: 3 },
  { role: "guns", quirk: "hot temper", pilot: 3, fighter: 9, trader: 2, engineer: 3 },
  { role: "wrench", quirk: "cloak-rated", pilot: 3, fighter: 3, trader: 2, engineer: 9, label: "Quiet Hands" },
];

function waspHands() {
  const card = { role: "hand", quirk: "dock-smart", pilot: 7, fighter: 7, trader: 7, engineer: 7 };
  return [Object.assign({}, card), Object.assign({}, card), Object.assign({}, card)];
}

function cargoUsed(st) {
  return Object.values(st.cargo || {}).reduce((a, b) => a + Number(b || 0), 0);
}

function jettisonToFit(st, maxCargo) {
  const ids = Object.keys(st.cargo || {});
  let used = cargoUsed(st);
  let jettison = 0;
  while (used > maxCargo) {
    let dumped = false;
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      if ((st.cargo[id] || 0) > 0) {
        st.cargo[id] -= 1;
        used -= 1;
        jettison += 1;
        dumped = true;
        break;
      }
    }
    if (!dumped) break;
  }
  return jettison;
}

function applyHullKit(st, hullId, roster) {
  const ss = shipFor(hullId);
  if (!SHIP_STATS[hullId] && hullId !== "skiff-7") {
    return { ok: false, error: "unknown_ship" };
  }
  st.cargo = st.cargo || {};
  const jettison = jettisonToFit(st, ss.cargo | 0);
  st.shipId = hullId;
  st.fuel = ss.fuelMax | 0;
  if (ss.hullMax != null) st.hull = ss.hullMax | 0;
  if (ss.ammoMax != null) st.ammo = ss.ammoMax | 0;
  st.roster = (roster || []).map((c) => Object.assign({}, c)).slice(0, ss.crewMax | 0);
  st.crew = st.roster.length;
  return { ok: true, jettison };
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
            st.quests.push({
              id: Date.now().toString(),
              dest,
              title,
              reward,
              maxJumps: 10,
              jumpsLeft: 10,
              createdEpoch: Date.now()
            });
            questMsg = `Bought the Press. Found a new lead: ${title} (₩${reward})`;
          }
        }
        st.lastPress = {
          masthead: `The ${String(st.system || "Station").toUpperCase()} Dispatch`,
          lines: [questMsg, "Local market updates published. Review commodity values on the Market tab."],
          tips: [],
        };
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
      const completed = [];
      const active = [];
      let totalReward = 0;
      let totalPenalty = 0;
      for (const q of st.quests) {
        if (q.dest === st.system) {
          const left = q.jumpsLeft != null ? q.jumpsLeft : 10;
          const isFast = left >= 7;
          const bonus = isFast ? Math.floor((q.reward || 0) * 0.35) : 0;
          const payout = (q.reward || 0) + bonus;
          totalReward += payout;
          completed.push({ q, isFast, payout });
        } else {
          const nextLeft = (q.jumpsLeft != null ? q.jumpsLeft : 10) - 1;
          if (nextLeft <= 0) {
            totalPenalty += 1000;
          } else {
            active.push(Object.assign({}, q, { jumpsLeft: nextLeft }));
          }
        }
      }
      st.quests = active;
      if (totalReward > 0) st.credits = (st.credits || 0) + totalReward;
      if (totalPenalty > 0) st.credits = Math.max(0, (st.credits || 0) - totalPenalty);
      if (completed.length > 0) jumpLog += ` Completed ${completed.length} quest(s) for ₩${totalReward}!`;
      if (totalPenalty > 0) jumpLog += ` Contract expired: fined ₩${totalPenalty}!`;
      
      result = { ok: true, system: st.system, log: jumpLog };
    } else if (op === "abandon_quest") {
      const qId = body && (body.id || (body.args && body.args.id));
      st.quests = st.quests || [];
      const idx = st.quests.findIndex(q => q.id === qId);
      if (idx >= 0) {
        const q = st.quests[idx];
        st.quests.splice(idx, 1);
        st.credits = Math.max(0, (st.credits || 0) - 500);
        result = { ok: true, log: `Abandoned ${q.title} (−₩500 fee)` };
      } else {
        result = { ok: false, log: "Quest not found" };
      }
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
    } else if (op === "god_credits") {
      const amount = body.amount == null ? 50000 : (body.amount | 0);
      st.credits = (st.credits | 0) + Math.max(0, amount);
      st.log = `God: +₩${Math.max(0, amount).toLocaleString()}.`;
      result = { ok: true, credits: st.credits, log: st.log };
    } else if (op === "god_fuel") {
      const ss = shipFor(st.shipId);
      st.fuel = ss.fuelMax | 0;
      st.log = "God: tanks topped.";
      result = { ok: true, fuel: st.fuel, log: st.log };
    } else if (op === "god_yard") {
      st.godYard = true;
      st.log = "God: full yard unlocked at every dock.";
      result = { ok: true, godYard: true, log: st.log };
    } else if (op === "grant_unbowed") {
      const r = applyHullKit(st, "unbowed", PEAK_UNBOWED_CREW);
      if (!r.ok) {
        result = r;
      } else {
        const jnote = r.jettison ? ` Jettisoned ${r.jettison} cargo.` : "";
        st.log = "Unbowed granted — peak crew aboard. Career unlock still locked." + jnote;
        result = { ok: true, jettison: r.jettison, shipId: st.shipId, crew: st.crew, log: st.log };
      }
    } else if (op === "grant_wasp") {
      const r = applyHullKit(st, "wasp-prime", waspHands());
      if (!r.ok) {
        result = r;
      } else {
        const jnote = r.jettison ? ` — jettisoned ${r.jettison} cargo.` : ".";
        st.log = "God: Wasp Prime + hands aboard" + jnote;
        result = { ok: true, jettison: r.jettison, shipId: st.shipId, crew: st.crew, log: st.log };
      }
    } else if (op === "set_prefs") {
      st.prefs = st.prefs || { autoFuel: true };
      if (body.autoFuel != null) st.prefs.autoFuel = !!body.autoFuel;
      if (body.godMode != null) st.prefs.godMode = !!body.godMode;
      st.log = st.prefs.autoFuel ? "Auto-refuel on arrive: ON." : "Auto-refuel on arrive: OFF.";
      result = { ok: true, prefs: st.prefs, log: st.log };
    } else if (op === "new_game") {
      // Soft reset — keep chart seed if present; Fold usually rebuilds via save blob.
      st.credits = 3200;
      st.shipId = "skiff-7";
      st.fuel = shipFor("skiff-7").fuelMax;
      st.crew = 0;
      st.roster = [];
      st.godYard = false;
      st.cargo = { ore: 0, grain: 0, optics: 0, meds: 0, spice: 0, scrap: 0 };
      st.system = "ember";
      st.dockWorkAt = null;
      st.pressBoughtAt = null;
      st.lastPress = null;
      st.agentLog = [];
      st.pilot = "human";
      st.prefs = st.prefs || { autoFuel: true };
      st.log = "Shared seat wiped — fresh Skiff-7 at Ember Reach.";
      result = { ok: true, log: st.log };
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
      console.warn("[bridge] /api/save bad JSON payload:", e.message);
      return sendJson(res, 400, { ok: false, error: "bad_json" });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end("Method Not Allowed");
  }

  const filePath = safeJoin(ROOT, (url.pathname === "/" || url.pathname === "") ? "/index.html" : url.pathname);
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
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.error(`Skiff bridge server http://${HOST}:${PORT}/`);
  console.error(`WebMCP active in browser session`);
});
