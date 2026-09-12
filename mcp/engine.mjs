/** Headless Skiff Run engine — mechanical parity with play UI for MCP / tests. */
export const VERSION = "0.8.3";
export const RULESET = "skiff-headless-0.8.3";
const RETIRE_NET = 35000;
const FUEL_PRICE = 45;
const CREW_HIRE = 800;
const CREW_FIRE_REFUND = 200;

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
];

export const SHIPS = [
  { id: "skiff-7", name: "Skiff-7", cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, price: 0 },
  { id: "hold-barge", name: "Hold Barge", cargo: 40, fuelMax: 18, range: 32, weapons: false, crewMax: 3, price: 9000 },
  { id: "ember-cutter", name: "Ember Cutter", cargo: 16, fuelMax: 16, range: 38, weapons: true, crewMax: 2, price: 12000 },
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
    const minD = 16;
    const pad = 10;
    const pos = {};
    const placeOne = (id, prefer) => {
      for (let attempt = 0; attempt < 80; attempt++) {
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
    for (let n = 0; n < 40 && !connected(); n++) {
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
      const rad = 12 + rand() * 8;
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
      epoch: 1,
      chart,
      visited: { ember: true },
      pilot: "agent",
      prefs: { autoFuel: true },
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
    const nodes = this.systems
      .filter((s) => mode !== "local" || s.id === here || this.inRange(here, s.id))
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
    const armed = this.hull().weapons && this.state.crew > 0;
    if (kind === "warden") {
      if (choice === "a") {
        const fine = Math.min(this.state.credits, 400);
        this.state.credits -= fine;
        this.log(`Paid Wardens ₩${fine}.`);
      } else if (Math.random() < 0.55) {
        this.log("Bluff held. Wardens wave you on.");
      } else {
        const fine = Math.min(this.state.credits, 700);
        this.state.credits -= fine;
        this.log(`Bluff failed. Fine ₩${fine}.`);
      }
    } else if (kind === "trader") {
      if (choice === "b") this.log("Waved the trader off.");
      else {
        const held = GOODS.map((g) => g.id).filter((id) => (this.state.cargo[id] || 0) > 0);
        if (held.length && Math.random() < 0.55) {
          const id = held[Math.floor(Math.random() * held.length)];
          const p = Math.round((this.state.prices[id] || 40) * 1.12);
          this.state.cargo[id] -= 1;
          this.state.credits += p;
          this.log(`Trader bought 1 ${GOODS.find((g) => g.id === id).name} for ₩${p}.`);
        } else {
          const g = GOODS[Math.floor(Math.random() * GOODS.length)];
          const room = this.hull().cargo - this.cargoUsed();
          const p = Math.round((this.state.prices[g.id] || g.base) * 0.88);
          if (room >= 1 && this.state.credits >= p) {
            this.state.credits -= p;
            this.state.cargo[g.id] += 1;
            this.log(`Bought 1 ${g.name} off a trader for ₩${p}.`);
          } else this.log("Trader had nothing you could take.");
        }
      }
    } else if (armed && choice === "a") {
      const pir = dest.pirate || 3;
      const odds = 0.55 + this.state.crew * 0.06 - pir * 0.03;
      if (Math.random() < odds) {
        const prize = 350 + this.state.crew * 150 + pir * 40;
        this.state.credits += prize;
        this.log(`Corsairs broke off. Salvage ₩${prize}.`);
      } else {
        const loss = 400 + pir * 50;
        this.state.credits = Math.max(0, this.state.credits - loss);
        this.log(`Fight went bad. −₩${loss} repairs.`);
      }
    } else if (choice === "a") {
      let dumped = 0;
      const take = Math.min(3, 1 + Math.floor((dest.pirate || 3) / 3));
      const ids = GOODS.map((g) => g.id);
      while (dumped < take) {
        const held = ids.filter((id) => this.state.cargo[id] > 0);
        if (!held.length) break;
        const id = held[Math.floor(Math.random() * held.length)];
        this.state.cargo[id] -= 1;
        dumped += 1;
      }
      this.log(dumped ? `Corsairs took ${dumped} cargo.` : "Hold empty — they laugh and leave.");
    } else {
      const burn = Math.min(this.state.fuel, 1 + (Math.random() < 0.35 ? 1 : 0));
      if (this.state.fuel >= 1) {
        this.state.fuel -= burn;
        this.log(`Fled. −${burn} fuel.`);
      } else {
        this.state.credits = Math.max(0, this.state.credits - 250);
        this.log("No fuel to flee. Shaken down ₩250.");
      }
    }
    this.pendingEncounter = null;
    return { ok: true, ...this.snapshot() };
  }

  buyShip(id) {
    const lock = this.requirePilot();
    if (lock) return lock;
    const next = this.ship(id);
    if (!next) return { ok: false, error: "unknown_ship" };
    if (!this.sys(this.state.system).yard) return { ok: false, error: "no_yard" };
    if (this.cargoUsed() > next.cargo) return { ok: false, error: "cargo_overflow" };
    const trade = Math.floor((this.hull().price || 0) * 0.55);
    const due = Math.max(0, next.price - trade);
    if (this.state.credits < due) return { ok: false, error: "no_credits", need: due };
    this.state.credits -= due;
    this.state.shipId = next.id;
    this.state.crew = Math.min(this.state.crew, next.crewMax);
    if (this.state.fuel > next.fuelMax) this.state.fuel = next.fuelMax;
    this.log(`Signed for ${next.name}. Paid ₩${due}.`);
    return { ok: true, ...this.snapshot() };
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
}
