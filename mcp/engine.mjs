/** Headless Skiff Run engine — mechanical parity with play UI for MCP / tests. */
export const VERSION = "0.9.27";
export const RULESET = "skiff-0.9.27";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const AgentActionLog = require("../js/agent-action-log.js");
const RETIRE_NET = 35000;
const FUEL_PRICE = 45;
const CREW_HIRE = 800;
const CREW_FIRE_REFUND = 200;
const PRESS_PRICE = 75;
const DOCK_WORK_PAY = 400;

export const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
export const TECH_NAME = ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"];
export const SIZE_NAME = ["Tiny", "Small", "Medium", "Large", "Huge"];

export const GOODS = [
  { id: "ore", name: "Basalt Ore", base: 40 },
  { id: "grain", name: "Dry Grain", base: 28 },
  { id: "optics", name: "Lens Optics", base: 95 },
  { id: "meds", name: "Field Meds", base: 110 },
  { id: "spice", name: "Rack Spice", base: 70 },
  { id: "scrap", name: "Hull Scrap", base: 22 },
];

export const SYSTEM_DEFS = [
  { id: "ember", name: "Ember Reach", mods: { ore: 0.7, optics: 1.3, meds: 1.1 }, yard: true, tech: 5, size: 3, gov: "Compact Hub", police: 4, pirate: 2 },
  { id: "glass", name: "Glass Orchard", mods: { grain: 0.65, spice: 1.25, scrap: 1.1 }, tech: 3, size: 2, gov: "Orchard Freehold", police: 2, pirate: 3 },
  { id: "tide", name: "Tide Spur", mods: { meds: 0.75, ore: 1.2, optics: 1.15 }, tech: 4, size: 2, gov: "Spur League", police: 3, pirate: 4 },
  { id: "ash", name: "Ash Meridian", mods: { scrap: 0.6, spice: 0.9, grain: 1.2 }, yard: true, tech: 4, size: 2, gov: "Fringe Compact", police: 1, pirate: 6 },
  { id: "knot", name: "Knot Harbor", mods: { optics: 0.8, meds: 1.3, ore: 1.1 }, yard: true, tech: 6, size: 3, gov: "Harbor Syndicate", police: 5, pirate: 2 },
  { id: "quiet", name: "Quiet Moon", mods: { grain: 1.1, spice: 1.1, scrap: 1.15 }, retire: true, tech: 2, size: 1, gov: "Quiet Protectorate", police: 3, pirate: 1 },
  { id: "cinder", name: "Cinder Well", mods: { ore: 0.74, scrap: 1.24, optics: 1.19 }, yard: true, tech: 4, size: 2, gov: "Well Compact", police: 3, pirate: 4 },
  { id: "ledger", name: "Drift Ledger", mods: { optics: 0.72, meds: 1.22, scrap: 1.17 }, tech: 5, size: 2, gov: "Ledger Freehold", police: 4, pirate: 2 },
  { id: "spindle", name: "Rust Spindle", mods: { scrap: 0.61, grain: 1.26, meds: 1.06 }, tech: 3, size: 2, gov: "Spindle League", police: 2, pirate: 5 },
  { id: "cobaltfen", name: "Cobalt Fen", mods: { meds: 0.72, optics: 1.17, scrap: 1.17 }, tech: 5, size: 3, gov: "Fen Protectorate", police: 5, pirate: 1 },
  { id: "foldmargin", name: "Fold Margin", mods: { spice: 0.69, scrap: 1.3399999999999999, grain: 1.1400000000000001 }, tech: 4, size: 2, gov: "Margin Compact", police: 2, pirate: 4 },
  { id: "palekiln", name: "Pale Kiln", mods: { ore: 0.6799999999999999, spice: 1.23, grain: 1.1300000000000001 }, tech: 3, size: 2, gov: "Kiln Freehold", police: 2, pirate: 3 },
  { id: "ironquay", name: "Iron Quay", mods: { scrap: 0.63, meds: 1.23, ore: 1.08 }, yard: true, tech: 5, size: 3, gov: "Quay Syndicate", police: 4, pirate: 3 },
  { id: "softvault", name: "Soft Vault", mods: { meds: 0.7, ore: 1.15, optics: 1.1500000000000001 }, tech: 6, size: 2, gov: "Vault Compact", police: 6, pirate: 1 },
  { id: "brinegate", name: "Brine Gate", mods: { grain: 0.6, ore: 1.2, meds: 1.05 }, tech: 2, size: 2, gov: "Gate League", police: 3, pirate: 3 },
  { id: "sootladder", name: "Soot Ladder", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 }, tech: 3, size: 1, gov: "Ladder Compact", police: 1, pirate: 5 },
  { id: "coppervein", name: "Copper Vein", mods: { ore: 0.63, spice: 1.18, grain: 1.08 }, tech: 4, size: 2, gov: "Vein Freehold", police: 3, pirate: 3 },
  { id: "nightquill", name: "Night Quill", mods: { optics: 0.69, scrap: 1.24, grain: 1.1400000000000001 }, tech: 5, size: 1, gov: "Quill Protectorate", police: 4, pirate: 2 },
  { id: "ambersluice", name: "Amber Sluice", mods: { spice: 0.69, scrap: 1.19, grain: 1.1400000000000001 }, tech: 3, size: 2, gov: "Sluice League", police: 2, pirate: 4 },
  { id: "gritanchor", name: "Grit Anchor", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 }, tech: 2, size: 2, gov: "Anchor Compact", police: 2, pirate: 5 },
  { id: "loomreach", name: "Loom Reach", mods: { optics: 0.69, scrap: 1.29, grain: 1.1400000000000001 }, yard: true, tech: 6, size: 3, gov: "Loom Syndicate", police: 5, pirate: 2 },
  { id: "voidpeddle", name: "Void Peddle", mods: { spice: 0.6599999999999999, grain: 1.3099999999999998, meds: 1.11 }, tech: 4, size: 1, gov: "Peddle Freehold", police: 1, pirate: 6 },
  { id: "sparforge", name: "Spar Forge", mods: { ore: 0.69, scrap: 1.24, optics: 1.1400000000000001 }, tech: 5, size: 2, gov: "Forge Compact", police: 3, pirate: 3 },
  { id: "claybeacon", name: "Clay Beacon", mods: { grain: 0.6599999999999999, optics: 1.16, spice: 1.11 }, tech: 2, size: 2, gov: "Beacon League", police: 3, pirate: 2 },
  { id: "mistharbor", name: "Mist Harbor", mods: { meds: 0.63, spice: 1.18, ore: 1.08 }, tech: 4, size: 3, gov: "Mist Syndicate", police: 4, pirate: 3 },
  { id: "rimequay", name: "Rime Quay", mods: { scrap: 0.6699999999999999, optics: 1.3199999999999998, spice: 1.12 }, tech: 3, size: 2, gov: "Rime Compact", police: 2, pirate: 4 },
  { id: "flintcross", name: "Flint Cross", mods: { ore: 0.6, grain: 1.2999999999999998, meds: 1.05 }, tech: 3, size: 2, gov: "Cross Freehold", police: 2, pirate: 4 },
  { id: "emberfall", name: "Emberfall", mods: { spice: 0.6799999999999999, meds: 1.3299999999999998, ore: 1.1300000000000001 }, tech: 4, size: 2, gov: "Fall League", police: 3, pirate: 3 },
  { id: "saltmeridian", name: "Salt Meridian", mods: { grain: 0.62, meds: 1.3199999999999998, scrap: 1.07 }, tech: 3, size: 2, gov: "Salt Compact", police: 3, pirate: 3 },
  { id: "oxbow", name: "Oxbow Dock", mods: { scrap: 0.64, spice: 1.3399999999999999, grain: 1.09 }, tech: 2, size: 2, gov: "Oxbow Freehold", police: 2, pirate: 3 },
  { id: "wisphollow", name: "Wisp Hollow", mods: { meds: 0.62, optics: 1.27, scrap: 1.07 }, tech: 1, size: 1, gov: "Hollow Protectorate", police: 1, pirate: 2 },
  { id: "brassladder", name: "Brass Ladder", mods: { optics: 0.64, scrap: 1.3399999999999999, grain: 1.09 }, yard: true, tech: 6, size: 2, gov: "Brass Syndicate", police: 5, pirate: 2 },
  { id: "duskorchard", name: "Dusk Orchard", mods: { grain: 0.6799999999999999, spice: 1.3299999999999998, ore: 1.1300000000000001 }, tech: 3, size: 2, gov: "Dusk Freehold", police: 2, pirate: 3 },
  { id: "coilharbor", name: "Coil Harbor", mods: { ore: 0.71, optics: 1.16, spice: 1.1600000000000001 }, tech: 5, size: 3, gov: "Coil Compact", police: 4, pirate: 3 },
  { id: "redledger", name: "Red Ledger", mods: { spice: 0.72, optics: 1.17, scrap: 1.17 }, tech: 4, size: 2, gov: "Red League", police: 2, pirate: 5 },
  { id: "palespur", name: "Pale Spur", mods: { meds: 0.6599999999999999, grain: 1.3099999999999998, spice: 1.11 }, tech: 4, size: 1, gov: "Pale League", police: 3, pirate: 3 },
  { id: "tinreach", name: "Tin Reach", mods: { scrap: 0.6599999999999999, grain: 1.21, meds: 1.11 }, tech: 3, size: 2, gov: "Tin Compact", police: 3, pirate: 3 },
  { id: "mosskiln", name: "Moss Kiln", mods: { grain: 0.7, ore: 1.15, meds: 1.1500000000000001 }, tech: 2, size: 2, gov: "Moss Freehold", police: 2, pirate: 2 },
  { id: "shardquay", name: "Shard Quay", mods: { optics: 0.63, spice: 1.3299999999999998, ore: 1.08 }, tech: 5, size: 2, gov: "Shard Syndicate", police: 4, pirate: 3 },
  { id: "windfold", name: "Windfold", mods: { spice: 0.6, ore: 1.2999999999999998, optics: 1.05 }, tech: 3, size: 1, gov: "Fold Compact", police: 1, pirate: 5 },
  { id: "cruciblefen", name: "Crucible Fen", mods: { ore: 0.74, scrap: 1.29, optics: 1.19 }, tech: 5, size: 2, gov: "Crucible League", police: 3, pirate: 4 },
  { id: "lumendrift", name: "Lumen Drift", mods: { optics: 0.62, meds: 1.17, scrap: 1.07 }, yard: true, tech: 7, size: 3, gov: "Lumen Syndicate", police: 6, pirate: 1 },
  { id: "ashenquill", name: "Ashen Quill", mods: { meds: 0.73, spice: 1.3299999999999998, ore: 1.1800000000000002 }, tech: 4, size: 1, gov: "Ashen Protectorate", police: 3, pirate: 3 },
  { id: "thornharbor", name: "Thorn Harbor", mods: { scrap: 0.6799999999999999, meds: 1.2799999999999998, ore: 1.1300000000000001 }, tech: 3, size: 2, gov: "Thorn Compact", police: 2, pirate: 5 },
  { id: "silkbasalt", name: "Silk Basalt", mods: { ore: 0.61, optics: 1.21, spice: 1.06 }, tech: 4, size: 2, gov: "Basalt Freehold", police: 3, pirate: 2 },
  { id: "frostspindle", name: "Frost Spindle", mods: { optics: 0.64, scrap: 1.24, grain: 1.09 }, tech: 5, size: 2, gov: "Frost League", police: 4, pirate: 2 },
  { id: "torchmargin", name: "Torch Margin", mods: { spice: 0.72, optics: 1.17, scrap: 1.17 }, tech: 3, size: 2, gov: "Torch Compact", police: 2, pirate: 4 },
  { id: "nettlegate", name: "Nettle Gate", mods: { grain: 0.64, scrap: 1.24, optics: 1.09 }, tech: 2, size: 2, gov: "Nettle League", police: 3, pirate: 3 },
  { id: "obsidianfen", name: "Obsidian Fen", mods: { ore: 0.74, scrap: 1.29, optics: 1.19 }, tech: 4, size: 2, gov: "Obsidian Compact", police: 2, pirate: 5 },
  { id: "coralledger", name: "Coral Ledger", mods: { meds: 0.61, grain: 1.3099999999999998, spice: 1.06 }, tech: 5, size: 2, gov: "Coral Freehold", police: 4, pirate: 2 },
  { id: "skiffmere", name: "Skiffmere", mods: { scrap: 0.71, grain: 1.3099999999999998, meds: 1.1600000000000001 }, tech: 3, size: 2, gov: "Mere Compact", police: 3, pirate: 3 },
  { id: "quillbone", name: "Quillbone", mods: { optics: 0.71, grain: 1.26, spice: 1.1600000000000001 }, tech: 4, size: 1, gov: "Bone Protectorate", police: 3, pirate: 4 },
  { id: "marrowdock", name: "Marrow Dock", mods: { scrap: 0.61, grain: 1.16, meds: 1.06 }, tech: 2, size: 2, gov: "Marrow League", police: 2, pirate: 4 },
  { id: "vellumreach", name: "Vellum Reach", mods: { meds: 0.6599999999999999, grain: 1.3099999999999998, spice: 1.11 }, tech: 6, size: 2, gov: "Vellum Syndicate", police: 5, pirate: 1 },
  { id: "pitchorchard", name: "Pitch Orchard", mods: { grain: 0.6, ore: 1.2999999999999998, meds: 1.05 }, tech: 3, size: 2, gov: "Pitch Freehold", police: 2, pirate: 3 },
  { id: "crowbarquay", name: "Crowbar Quay", mods: { ore: 0.6, grain: 1.15, meds: 1.05 }, tech: 3, size: 2, gov: "Crowbar Compact", police: 1, pirate: 6 },
  { id: "lanternspur", name: "Lantern Spur", mods: { spice: 0.74, scrap: 1.29, grain: 1.19 }, tech: 4, size: 2, gov: "Lantern League", police: 3, pirate: 3 },
  { id: "softiron", name: "Soft Iron", mods: { ore: 0.74, scrap: 1.19, optics: 1.19 }, tech: 5, size: 3, gov: "Iron Compact", police: 4, pirate: 2 },
  { id: "dustcompact", name: "Dust Compact", mods: { scrap: 0.6599999999999999, grain: 1.26, meds: 1.11 }, tech: 2, size: 2, gov: "Dust Freehold", police: 2, pirate: 4 },
  { id: "coalridge", name: "Ridge of Coals", mods: { ore: 0.6799999999999999, spice: 1.3299999999999998, grain: 1.1300000000000001 }, tech: 3, size: 2, gov: "Ridge League", police: 2, pirate: 4 },
  { id: "mirrorbasin", name: "Mirror Basin", mods: { optics: 0.6699999999999999, meds: 1.27, scrap: 1.12 }, tech: 6, size: 2, gov: "Basin Syndicate", police: 5, pirate: 2 },
  { id: "hearthknot", name: "Hearth Knot", mods: { meds: 0.6, ore: 1.15, optics: 1.05 }, yard: true, tech: 5, size: 3, gov: "Hearth Compact", police: 4, pirate: 2 },
  { id: "farember", name: "Far Ember", mods: { spice: 0.71, grain: 1.3099999999999998, meds: 1.1600000000000001 }, tech: 4, size: 1, gov: "Far Compact", police: 2, pirate: 5 },
  { id: "gutterwake", name: "Gutter Wake", mods: { scrap: 0.71, grain: 1.26, meds: 1.1600000000000001 }, tech: 2, size: 1, gov: "Wake Freehold", police: 1, pirate: 6 }
];

export const SHIPS = [
  { id: "skiff-7", name: "Skiff-7", cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, price: 0 },
  { id: "hold-barge", name: "Hold Barge", cargo: 40, fuelMax: 18, range: 32, weapons: false, crewMax: 3, price: 9000 },
  { id: "ember-cutter", name: "Ember Cutter", cargo: 16, fuelMax: 16, range: 38, weapons: true, crewMax: 2, price: 12000 },
  { id: "unbowed", name: "Unbowed", cargo: 12, fuelMax: 16, range: 36, weapons: true, crewMax: 3, price: 0, gated: true },
];

/** Peak Unbowed crew — match Fold js/debug-god.js PEAK_UNBOWED_CREW. */
export const PEAK_UNBOWED_CREW = [
  { role: "helm", quirk: "steady hands", pilot: 9, fighter: 3, trader: 2, engineer: 3 },
  { role: "guns", quirk: "hot temper", pilot: 3, fighter: 9, trader: 2, engineer: 3 },
  { role: "wrench", quirk: "cloak-rated", pilot: 3, fighter: 3, trader: 2, engineer: 9, label: "Quiet Hands" },
];

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class SkiffGame {
  constructor() {
    this.systems = SYSTEM_DEFS.map((s) => ({ ...s, x: 50, y: 50 }));
    this.state = null;
    this.pendingEncounter = null;
    /** Who is issuing the next mutate: "agent" (MCP) or "human" (Fold bridge). */
    this.actorRole = "agent";
    this.newGame();
  }

  ensurePrefs() {
    if (!this.state) return;
    if (!this.state.prefs || typeof this.state.prefs !== "object") {
      this.state.prefs = { autoFuel: true };
    }
    if (this.state.prefs.autoFuel == null) this.state.prefs.autoFuel = true;
    if (!Array.isArray(this.state.agentLog)) this.state.agentLog = [];
    if (this.state.pressBoughtAt === undefined) this.state.pressBoughtAt = null;
    if (this.state.dockWorkAt === undefined) this.state.dockWorkAt = null;
    if (this.state.lastPress === undefined) this.state.lastPress = null;
  }

  setPrefs(partial = {}) {
    this.ensurePrefs();
    if (partial.autoFuel != null) this.state.prefs.autoFuel = !!partial.autoFuel;
    this.log(this.state.prefs.autoFuel ? "Auto-refuel on arrive: ON." : "Auto-refuel on arrive: OFF.");
    return { ok: true, ...this.snapshot() };
  }

  /** Refuel without pilot lock (used after arrive / internal). Partial OK. */
  applyRefuel() {
    const need = this.hull().fuelMax - this.state.fuel;
    if (need <= 0) return { filled: 0, spent: 0 };
    const cost = need * FUEL_PRICE;
    if (this.state.credits < cost) {
      const can = Math.floor(this.state.credits / FUEL_PRICE);
      if (can <= 0) return { filled: 0, spent: 0, broke: true };
      this.state.fuel += can;
      this.state.credits -= can * FUEL_PRICE;
      this.log(`Auto-refuel +${can} for ₩${can * FUEL_PRICE}.`);
      return { filled: can, spent: can * FUEL_PRICE };
    }
    this.state.fuel = this.hull().fuelMax;
    this.state.credits -= cost;
    this.log(`Auto-refuel full for ₩${cost}.`);
    return { filled: need, spent: cost };
  }

  maybeAutoRefuel() {
    this.ensurePrefs();
    if (!this.state.prefs.autoFuel) return null;
    return this.applyRefuel();
  }

  ship(id) { return SHIPS.find((s) => s.id === id); }
  hull() { return this.ship(this.state.shipId) || SHIPS[0]; }
  sys(id) { return this.systems.find((s) => s.id === id); }

  activityLabel(n) {
    const i = Math.max(0, Math.min(ACTIVITY.length - 1, n | 0));
    return ACTIVITY[i];
  }

  applyChart(chart) {
    if (!chart?.pos) return;
    this.systems = SYSTEM_DEFS.map((s) => {
      const p = chart.pos[s.id] || { x: 50, y: 50 };
      return { ...s, x: p.x, y: p.y };
    });
  }

  buildChart(seed) {
    seed = (seed >>> 0) || (Math.floor(Math.random() * 0xffffffff) || 1);
    const rand = mulberry32(seed);
    const minD = 7;
    const pad = 6;
    const pos = {};
    const placeOne = (id, prefer) => {
      for (let attempt = 0; attempt < 120; attempt++) {
        let x, y;
        if (prefer && attempt < 20) {
          x = prefer.x + (rand() - 0.5) * 24;
          y = prefer.y + (rand() - 0.5) * 24;
        } else if (attempt < 40) {
          const qi = SYSTEM_DEFS.findIndex((s) => s.id === id) % 4;
          const qx = qi % 2 === 0 ? pad + 8 : 55;
          const qy = qi < 2 ? pad + 8 : 55;
          x = qx + rand() * 32;
          y = qy + rand() * 32;
        } else {
          x = pad + rand() * (100 - pad * 2);
          y = pad + rand() * (100 - pad * 2);
        }
        x = Math.max(pad, Math.min(100 - pad, x));
        y = Math.max(pad, Math.min(100 - pad, y));
        let ok = true;
        for (const other of Object.values(pos)) {
          if (Math.hypot(other.x - x, other.y - y) < minD) { ok = false; break; }
        }
        if (ok) {
          pos[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
          return;
        }
      }
      pos[id] = { x: pad + rand() * (100 - pad * 2), y: pad + rand() * (100 - pad * 2) };
    };
    placeOne("ember", { x: 28, y: 55 });
    SYSTEM_DEFS.forEach((s) => { if (s.id !== "ember") placeOne(s.id, null); });
    this.applyChart({ seed, pos });
    const maxRange = Math.max(...SHIPS.map((s) => s.range));
    const connected = () => {
      const seen = new Set(["ember"]);
      const q = ["ember"];
      while (q.length) {
        const cur = q.pop();
        this.systems.forEach((s) => {
          if (seen.has(s.id)) return;
          if (this.dist(this.sys(cur), s) <= maxRange + 0.01) {
            seen.add(s.id);
            q.push(s.id);
          }
        });
      }
      return seen.size === this.systems.length;
    };
    for (let n = 0; n < 120 && !connected(); n++) {
      const orphan = this.systems.find((s) => {
        const seen = new Set(["ember"]);
        const q = ["ember"];
        while (q.length) {
          const cur = q.pop();
          this.systems.forEach((o) => {
            if (seen.has(o.id)) return;
            if (this.dist(this.sys(cur), o) <= maxRange + 0.01) { seen.add(o.id); q.push(o.id); }
          });
        }
        return !seen.has(s.id);
      });
      if (!orphan) break;
      const anchor = this.systems[Math.floor(rand() * this.systems.length)];
      const ang = rand() * Math.PI * 2;
      const rad = maxRange * (0.55 + rand() * 0.35);
      orphan.x = Math.max(pad, Math.min(100 - pad, anchor.x + Math.cos(ang) * rad));
      orphan.y = Math.max(pad, Math.min(100 - pad, anchor.y + Math.sin(ang) * rad));
      pos[orphan.id] = { x: Math.round(orphan.x * 10) / 10, y: Math.round(orphan.y * 10) / 10 };
      this.applyChart({ seed, pos });
    }
    return { seed, pos };
  }

  priceFor(system, good) {
    const m = system.mods[good.id] || 1;
    const size = system.size == null ? 2 : system.size;
    const sizeMul = (100 - size * 3) / 100;
    const h = hash32(system.id + ":" + good.id);
    const jitter = 0.92 + ((h % 160) / 1000);
    return Math.max(8, Math.round(good.base * m * sizeMul * jitter));
  }

  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  fuelCost(fromId, toId) { return Math.max(1, Math.ceil(this.dist(this.sys(fromId), this.sys(toId)) / 14)); }
  inRange(fromId, toId) { return this.dist(this.sys(fromId), this.sys(toId)) <= this.hull().range + 0.01; }

  cargoUsed(st = this.state) {
    return Object.values(st.cargo).reduce((a, b) => a + b, 0);
  }

  inventoryValue(st = this.state) {
    return GOODS.reduce((sum, g) => sum + (st.cargo[g.id] || 0) * (st.prices[g.id] || g.base), 0);
  }

  netWorth(st = this.state) {
    return st.credits + this.inventoryValue(st) + Math.floor((this.ship(st.shipId)?.price || 0) * 0.5);
  }

  rollMarket() {
    const s = this.sys(this.state.system);
    this.state.prices = {};
    GOODS.forEach((g) => { this.state.prices[g.id] = this.priceFor(s, g); });
  }

  peekPrices(systemId) {
    const s = this.sys(systemId);
    const out = {};
    GOODS.forEach((g) => { out[g.id] = this.priceFor(s, g); });
    return out;
  }

  markVisited(id) {
    if (!this.state.visited) this.state.visited = {};
    this.state.visited[id] = true;
  }

  log(msg) { this.state.log = msg; }

  newGame(seed) {
    const chart = this.buildChart(seed);
    this.applyChart(chart);
    this.state = {
      v: VERSION,
      system: "ember",
      credits: 3200,
      fuel: SHIPS[0].fuelMax,
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      prices: {},
      shipId: "skiff-7",
      crew: 0,
      roster: [],
      godYard: false,
      epoch: 1,
      chart,
      visited: { ember: true },
      pilot: "agent",
      prefs: { autoFuel: true },
      agentLog: [],
      pressBoughtAt: null,
      dockWorkAt: null,
      lastPress: null,
      log: "MCP seat online. Skiff-7 cleared Ember Reach.",
    };
    this.pendingEncounter = null;
    this.rollMarket();
    return this.snapshot();
  }

  requirePilot(forMutate = true) {
    const actor = this.actorRole === "human" ? "human" : "agent";
    if (forMutate && this.state.pilot !== actor) {
      return {
        ok: false,
        error: "pilot_locked",
        pilot: this.state.pilot,
        actor,
        hint: this.state.pilot === "human"
          ? "Human has the stick. Use skiff_claim or wait for handoff."
          : "Agent has the stick. Take stick in Fold, or wait for release.",
      };
    }
    if (this.pendingEncounter && forMutate) {
      return { ok: false, error: "encounter_pending", encounter: this.pendingEncounter };
    }
    return null;
  }

  claim() {
    this.state.pilot = "agent";
    this.log("Agent has the stick.");
    return this.snapshot();
  }

  release() {
    this.state.pilot = "human";
    this.log("Captain took the stick.");
    return this.snapshot();
  }

  snapshot() {
    const h = this.hull();
    const s = this.sys(this.state.system);
    return {
      ruleset: RULESET,
      version: VERSION,
      pilot: this.state.pilot,
      system: { id: s.id, name: s.name, gov: s.gov, tech: TECH_NAME[s.tech | 0], size: SIZE_NAME[s.size | 0], police: this.activityLabel(s.police), pirate: this.activityLabel(s.pirate), yard: !!s.yard, retire: !!s.retire },
      credits: this.state.credits,
      fuel: this.state.fuel,
      fuelMax: h.fuelMax,
      cargo: { ...this.state.cargo },
      cargoUsed: this.cargoUsed(),
      cargoMax: h.cargo,
      prices: { ...this.state.prices },
      ship: { id: h.id, name: h.name, weapons: h.weapons, range: h.range, crew: this.state.crew, crewMax: h.crewMax },
      roster: Array.isArray(this.state.roster) ? this.state.roster.map((c) => ({ ...c })) : [],
      netWorth: this.netWorth(),
      canRetire: !!(s.retire && this.netWorth() >= RETIRE_NET),
      visited: { ...this.state.visited },
      prefs: { ...(this.state.prefs || { autoFuel: true }) },
      log: this.state.log,
      pendingEncounter: this.pendingEncounter,
    };
  }

  chart(mode = "local") {
    const here = this.state.system;
    const SECTOR_RADIUS = 48;
    const nodes = this.systems
      .filter((s) => {
        if (s.id === here) return true;
        if (mode === "local") return this.inRange(here, s.id);
        if (mode === "sector") return this.dist(this.sys(here), s) <= SECTOR_RADIUS + 0.01;
        return true; // full
      })
      .map((s) => {
        const reach = s.id === here || this.inRange(here, s.id);
        const peek = this.peekPrices(s.id);
        let bestEdge = null;
        GOODS.forEach((g) => {
          const edge = peek[g.id] - this.state.prices[g.id];
          if (bestEdge == null || edge > bestEdge.edge) bestEdge = { good: g.id, edge };
        });
        return {
          id: s.id,
          name: s.name,
          x: s.x,
          y: s.y,
          here: s.id === here,
          reach,
          fuelCost: s.id === here ? 0 : this.fuelCost(here, s.id),
          visited: !!this.state.visited[s.id],
          police: this.activityLabel(s.police),
          pirate: this.activityLabel(s.pirate),
          pirateLevel: s.pirate | 0,
          gov: s.gov,
          yard: !!s.yard,
          laneEdge: bestEdge,
        };
      });
    return { mode, here, nodes };
  }

  buy(goodId, qty = 1) {
    const lock = this.requirePilot();
    if (lock) return lock;
    qty = Math.max(1, qty | 0);
    const p = this.state.prices[goodId];
    if (p == null) return { ok: false, error: "unknown_good" };
    const room = this.hull().cargo - this.cargoUsed();
    if (room <= 0) return { ok: false, error: "hold_full" };
    const canPay = Math.floor(this.state.credits / p);
    const n = Math.min(qty, room, canPay);
    if (n < 1) return { ok: false, error: "no_credits" };
    this.state.credits -= p * n;
    this.state.cargo[goodId] += n;
    this.log(`Bought ${n} ${GOODS.find((g) => g.id === goodId).name} for ₩${p * n}.`);
    return { ok: true, ...this.snapshot() };
  }

  sell(goodId, qty = 1) {
    const lock = this.requirePilot();
    if (lock) return lock;
    qty = Math.max(1, qty | 0);
    const have = this.state.cargo[goodId] || 0;
    if (have < 1) return { ok: false, error: "nothing_to_sell" };
    const n = Math.min(qty, have);
    const p = this.state.prices[goodId];
    this.state.cargo[goodId] -= n;
    this.state.credits += p * n;
    this.log(`Sold ${n} ${GOODS.find((g) => g.id === goodId).name} for ₩${p * n}.`);
    return { ok: true, ...this.snapshot() };
  }

  sellAll() {
    const lock = this.requirePilot();
    if (lock) return lock;
    let total = 0, units = 0;
    GOODS.forEach((g) => {
      const have = this.state.cargo[g.id] || 0;
      if (have < 1) return;
      const p = this.state.prices[g.id];
      this.state.cargo[g.id] = 0;
      this.state.credits += p * have;
      total += p * have;
      units += have;
    });
    if (units < 1) return { ok: false, error: "hold_empty" };
    this.log(`Sold all (${units} units) for ₩${total}.`);
    return { ok: true, ...this.snapshot() };
  }

  refuel() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const need = this.hull().fuelMax - this.state.fuel;
    if (need <= 0) return { ok: false, error: "tanks_full" };
    const cost = need * FUEL_PRICE;
    if (this.state.credits < cost) {
      const can = Math.floor(this.state.credits / FUEL_PRICE);
      if (can <= 0) return { ok: false, error: "no_credits" };
      this.state.fuel += can;
      this.state.credits -= can * FUEL_PRICE;
      this.log(`Partial refuel +${can} for ₩${can * FUEL_PRICE}.`);
    } else {
      this.state.fuel = this.hull().fuelMax;
      this.state.credits -= cost;
      this.log(`Refueled for ₩${cost}.`);
    }
    return { ok: true, ...this.snapshot() };
  }

  jump(toId) {
    const lock = this.requirePilot();
    if (lock) return lock;
    if (!this.sys(toId)) return { ok: false, error: "unknown_system" };
    if (!this.inRange(this.state.system, toId)) return { ok: false, error: "out_of_range" };
    const cost = this.fuelCost(this.state.system, toId);
    if (this.state.fuel < cost) return { ok: false, error: "need_fuel", need: cost };
    this.state.fuel -= cost;
    this.state.system = toId;
    this.markVisited(toId);
    this.state.dockWorkAt = null;
    this.state.pressBoughtAt = null;
    this.rollMarket();
    this.log(`Arrived ${this.sys(toId).name} (−${cost} fuel).`);
    this.maybeAutoRefuel();
    this.rollEncounter(toId);
    return { ok: true, ...this.snapshot() };
  }

  rollEncounter(toId) {
    const dest = this.sys(toId);
    const police = dest.police | 0;
    const pirate = dest.pirate | 0;
    const h = this.hull();
    const quietHull = h.cargo <= 20 && !h.weapons;
    const scale = quietHull ? 0.62 : 1;
    const pCorsair = (pirate / 7) * 0.48 * scale;
    const pWarden = (police / 7) * 0.36 * scale;
    const pTrader = ((7 - pirate) / 7) * 0.14 * scale;
    const r = Math.random();
    let kind = null;
    if (r < pCorsair) kind = "corsair";
    else if (r < pCorsair + pWarden) kind = "warden";
    else if (r < pCorsair + pWarden + pTrader) kind = "trader";
    if (!kind) {
      this.pendingEncounter = null;
      return;
    }
    const armed = h.weapons && this.state.crew > 0;
    const options =
      kind === "warden" ? [{ id: "a", label: "Pay fine" }, { id: "b", label: "Bluff" }]
      : kind === "trader" ? [{ id: "a", label: "Hail" }, { id: "b", label: "Wave off" }]
      : armed ? [{ id: "a", label: "Fight" }, { id: "b", label: "Flee" }]
      : [{ id: "a", label: "Dump cargo" }, { id: "b", label: "Flee" }];
    this.pendingEncounter = {
      kind,
      systemId: toId,
      systemName: dest.name,
      police: this.activityLabel(dest.police),
      pirate: this.activityLabel(dest.pirate),
      options,
    };
  }

  resolveEncounter(choice) {
    if (!this.pendingEncounter) return { ok: false, error: "no_encounter" };
    const actor = this.actorRole === "human" ? "human" : "agent";
    const lock = this.state.pilot !== actor
      ? { ok: false, error: "pilot_locked", pilot: this.state.pilot, actor }
      : null;
    if (lock) return lock;
    const kind = this.pendingEncounter.kind;
    const dest = this.sys(this.pendingEncounter.systemId) || this.sys(this.state.system);
    
    const { resolveEncounter } = require("../js/core/combat.js");
    
    const result = resolveEncounter({
      state: this.state,
      encKind: kind,
      dest: dest,
      choice: choice,
      GOODS: GOODS,
      hull: this.hull(),
      cargoUsed: this.cargoUsed(),
      tickSkill: null,
      rand: Math.random
    });
    
    // logMsg might contain spaces. We split by '.' or just log the whole thing.
    if (result.logMsg) {
      result.logMsg.split('. ').forEach(msg => {
        if (msg.trim()) this.log(msg.trim() + (msg.endsWith('.') ? '' : '.'));
      });
    }
    
    this.pendingEncounter = null;
    return { ok: true, ...this.snapshot() };
  }

  /** Commons yard list — never includes gated hulls (Unbowed). */
  openYardStock() {
    return SHIPS.filter((s) => !s.gated);
  }

  yardOpenStock() {
    return this.openYardStock();
  }

  buyShip(id) {
    const lock = this.requirePilot();
    if (lock) return lock;
    const next = this.ship(id);
    if (!next) return { ok: false, error: "unknown_ship" };
    if (next.gated && !this.state.godYard) return { ok: false, error: "gated_hull" };
    if (!this.sys(this.state.system).yard) return { ok: false, error: "no_yard" };
    if (this.cargoUsed() > next.cargo) return { ok: false, error: "cargo_overflow" };
    const trade = Math.floor((this.hull().price || 0) * 0.55);
    const due = Math.max(0, next.price - trade);
    if (this.state.credits < due) return { ok: false, error: "no_credits", need: due };
    this.state.credits -= due;
    this.state.shipId = next.id;
    this.state.crew = Math.min(this.state.crew, next.crewMax);
    if (Array.isArray(this.state.roster)) {
      this.state.roster = this.state.roster.slice(0, next.crewMax);
      this.state.crew = Math.min(this.state.crew, this.state.roster.length || this.state.crew);
    }
    if (this.state.fuel > next.fuelMax) this.state.fuel = next.fuelMax;
    this.log(`Signed for ${next.name}. Paid ₩${due}.`);
    return { ok: true, ...this.snapshot() };
  }

  /**
   * God/debug Unbowed kit — match Fold grantUnbowed / PEAK_UNBOWED_CREW.
   * Not a career path; spectator long-run / MCP grant only.
   */
  grantUnbowed() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const next = this.ship("unbowed");
    if (!next) return { ok: false, error: "unknown_ship" };
    // Jettison overflow to fit Unbowed cargo 12.
    const ids = Object.keys(this.state.cargo);
    let used = this.cargoUsed();
    let jettison = 0;
    while (used > next.cargo) {
      let dumped = false;
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        if ((this.state.cargo[id] || 0) > 0) {
          this.state.cargo[id] -= 1;
          used -= 1;
          jettison += 1;
          dumped = true;
          break;
        }
      }
      if (!dumped) break;
    }
    this.state.shipId = next.id;
    this.state.fuel = next.fuelMax;
    this.state.roster = PEAK_UNBOWED_CREW.map((c) => ({ ...c }));
    this.state.crew = this.state.roster.length;
    const jnote = jettison ? ` Jettisoned ${jettison} cargo to fit hold.` : "";
    this.log(`God/debug Unbowed kit granted — peak crew (Quiet Hands cloak-rated).${jnote}`);
    return { ok: true, jettison, ...this.snapshot() };
  }

  hireCrew() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const h = this.hull();
    if (this.state.crew >= h.crewMax) return { ok: false, error: "no_bunks" };
    if (this.state.credits < CREW_HIRE) return { ok: false, error: "no_credits" };
    this.state.credits -= CREW_HIRE;
    this.state.crew += 1;
    this.log(`Hired hand. Crew ${this.state.crew}/${h.crewMax}.`);
    return { ok: true, ...this.snapshot() };
  }

  fireCrew() {
    const lock = this.requirePilot();
    if (lock) return lock;
    if (this.state.crew < 1) return { ok: false, error: "no_crew" };
    this.state.crew -= 1;
    this.state.credits += CREW_FIRE_REFUND;
    this.log(`Dismissed a hand. +₩${CREW_FIRE_REFUND}.`);
    return { ok: true, ...this.snapshot() };
  }

  retire() {
    const lock = this.requirePilot();
    if (lock) return lock;
    if (!(this.sys(this.state.system).retire && this.netWorth() >= RETIRE_NET)) {
      return { ok: false, error: "cannot_retire", need: RETIRE_NET, net: this.netWorth() };
    }
    this.log(`Retired on Quiet Moon. Net ₩${this.netWorth()}. Victory.`);
    return { ok: true, victory: true, ...this.snapshot() };
  }


  galaxyAveragePrice(good) {
    if (!this.systems.length) return good.base;
    let sum = 0;
    for (const s of this.systems) sum += this.priceFor(s, good);
    return sum / this.systems.length;
  }

  marketCue(localPrice, avgPrice, have) {
    const avg = avgPrice || 1;
    const ratio = localPrice / avg;
    if (ratio <= 0.92) return { tone: "buy", label: "Cheap — buy", ratio };
    if (ratio >= 1.08) {
      return { tone: "avoid", label: (have | 0) > 0 ? "Expensive — sell" : "Expensive — skip", ratio };
    }
    return { tone: "fair", label: "Fair", ratio };
  }

  /** Dock Press — once per system; simplified masthead+tips for headless. */
  buyPress() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const systemId = this.state.system;
    if (this.state.pressBoughtAt === systemId) {
      return { ok: false, error: "already", reason: "already", ...this.snapshot() };
    }
    if (this.state.credits < PRESS_PRICE) {
      return { ok: false, error: "no_credits", reason: "credits", ...this.snapshot() };
    }
    this.state.credits -= PRESS_PRICE;
    this.state.pressBoughtAt = systemId;
    const here = this.sys(systemId);
    const masthead = "Dock Press — " + (here?.name || "Unknown dock");
    const tips = [];
    const others = this.systems.filter((s) => s.id !== systemId);
    if (GOODS.length && others.length) {
      const g = GOODS[Math.floor(Math.random() * GOODS.length)];
      const ranked = others
        .map((s) => ({ s, p: this.priceFor(s, g) }))
        .sort((a, b) => a.p - b.p);
      if (Math.random() < 0.5) {
        const cheap = ranked[0];
        tips.push(`Traders whisper ${g.name} is cheap at ${cheap.s.name} (list ~₩${cheap.p}).`);
      } else {
        const dear = ranked[ranked.length - 1];
        tips.push(`Bulletin: ${g.name} runs expensive at ${dear.s.name} (list ~₩${dear.p}).`);
      }
    }
    const yard = others.filter((s) => s.yard);
    if (yard.length) {
      const s = yard[Math.floor(Math.random() * yard.length)];
      tips.push(`Yard slips open at ${s.name} — hulls and bunks if your ledger holds.`);
    } else {
      tips.push("Lane quiet. Refuel, shift docks, listen for the next edition.");
    }
    while (tips.length < 2) tips.push("Weather fax blank. The Press still took your credits.");
    if (tips.length > 3) tips.length = 3;
    this.state.lastPress = { masthead, tips, lines: tips.slice(), price: PRESS_PRICE };
    this.log(`Bought Dock Press for ₩${PRESS_PRICE}. ${masthead}`);
    return { ok: true, paid: PRESS_PRICE, lastPress: this.state.lastPress, ...this.snapshot() };
  }

  /** Buy max affordable of the locally cheapest (vs galaxy avg) good. */
  fillCheap() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const room = this.hull().cargo - this.cargoUsed();
    if (room < 1) {
      this.log("Nothing cheap here.");
      return { ok: false, error: "nothing_cheap", reason: "nothing_cheap", ...this.snapshot() };
    }
    let best = null;
    for (const g of GOODS) {
      const local = this.state.prices[g.id];
      const avg = this.galaxyAveragePrice(g);
      if (local == null) continue;
      const cue = this.marketCue(local, avg, this.state.cargo[g.id] || 0);
      if (cue.tone !== "buy") continue;
      const n = Math.min(room, Math.floor(this.state.credits / local));
      if (n < 1) continue;
      const savedPer = avg - local;
      const cand = { id: g.id, name: g.name, n, price: local, savedPer };
      if (!best || savedPer > best.savedPer || (savedPer === best.savedPer && n > best.n)) best = cand;
    }
    if (!best) {
      this.log("Nothing cheap here.");
      return { ok: false, error: "nothing_cheap", reason: "nothing_cheap", ...this.snapshot() };
    }
    this.state.credits -= best.price * best.n;
    this.state.cargo[best.id] += best.n;
    const spent = best.price * best.n;
    this.log(`Filled cheap: ${best.n} ${best.name} for ₩${spent}.`);
    return { ok: true, id: best.id, name: best.name, n: best.n, price: best.price, spent, ...this.snapshot() };
  }

  /** Sell held goods priced expensive vs galaxy avg. */
  sellExpensive() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const sold = [];
    let total = 0;
    let units = 0;
    for (const g of GOODS) {
      const have = this.state.cargo[g.id] || 0;
      if (have < 1) continue;
      const local = this.state.prices[g.id];
      const avg = this.galaxyAveragePrice(g);
      if (local == null) continue;
      const cue = this.marketCue(local, avg, have);
      if (cue.tone !== "avoid") continue;
      this.state.cargo[g.id] = 0;
      const lineTotal = local * have;
      this.state.credits += lineTotal;
      sold.push({ id: g.id, name: g.name, n: have, total: lineTotal });
      total += lineTotal;
      units += have;
    }
    if (units < 1) {
      this.log("Nothing expensive in hold.");
      return { ok: false, error: "nothing_expensive", reason: "nothing_expensive", sold: [], total: 0, units: 0, ...this.snapshot() };
    }
    const names = sold.map((s) => `${s.n} ${s.name}`).join(", ");
    this.log(`Sold expensive: ${names} for ₩${total}.`);
    return { ok: true, sold, total, units, ...this.snapshot() };
  }

  /** Once-per-system dock work (+₩400). */
  dockWork() {
    const lock = this.requirePilot();
    if (lock) return lock;
    const systemId = this.state.system;
    if (this.state.dockWorkAt === systemId) {
      return { ok: false, error: "already", reason: "already", ...this.snapshot() };
    }
    this.state.credits += DOCK_WORK_PAY;
    this.state.dockWorkAt = systemId;
    this.log(`Dock work shift. +₩${DOCK_WORK_PAY}.`);
    return { ok: true, pay: DOCK_WORK_PAY, ...this.snapshot() };
  }

  /**
   * Append a spectator agent act to state.agentLog (newest last).
   * Skip observe-only ops (state/ruleset/chart). Persist via next persistGame.
   */
  recordAgentAct(op, result) {
    if (!this.state) return;
    if (!AgentActionLog.shouldLog(op)) return;
    const summary = AgentActionLog.summarize(op, result);
    const entry = { t: Date.now(), op: String(op), summary };
    this.state.agentLog = AgentActionLog.append(this.state.agentLog || [], entry);
  }
}
