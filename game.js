(() => {
  "use strict";
  const VERSION = "0.1.1";
  const SAVE_KEY = "skiff-run-v1";
  const RETIRE_NET = 35000;
  const FUEL_PRICE = 45;

  const GOODS = [
    { id: "ore", name: "Basalt Ore", base: 40 },
    { id: "grain", name: "Dry Grain", base: 28 },
    { id: "optics", name: "Lens Optics", base: 95 },
    { id: "meds", name: "Field Meds", base: 110 },
    { id: "spice", name: "Rack Spice", base: 70 },
    { id: "scrap", name: "Hull Scrap", base: 22 },
  ];

  const SYSTEMS = [
    { id: "ember", name: "Ember Reach", links: ["glass", "tide"], mods: { ore: 0.7, optics: 1.3, meds: 1.1 } },
    { id: "glass", name: "Glass Orchard", links: ["ember", "quiet", "ash"], mods: { grain: 0.65, spice: 1.25, scrap: 1.1 } },
    { id: "tide", name: "Tide Spur", links: ["ember", "ash", "knot"], mods: { meds: 0.75, ore: 1.2, optics: 1.15 } },
    { id: "ash", name: "Ash Meridian", links: ["glass", "tide", "quiet"], mods: { scrap: 0.6, spice: 0.9, grain: 1.2 } },
    { id: "knot", name: "Knot Harbor", links: ["tide", "quiet"], mods: { optics: 0.8, meds: 1.3, ore: 1.1 } },
    { id: "quiet", name: "Quiet Moon", links: ["glass", "ash", "knot"], mods: { grain: 1.1, spice: 1.1, scrap: 1.15 }, retire: true },
  ];

  const HULL = { name: "Skiff-7", cargo: 20, fuelMax: 14, hp: 100 };

  function sys(id) { return SYSTEMS.find((s) => s.id === id); }
  function price(system, good) {
    const m = system.mods[good.id] || 1;
    const jitter = 0.92 + Math.random() * 0.16;
    return Math.max(8, Math.round(good.base * m * jitter));
  }

  function fresh() {
    return {
      v: VERSION,
      system: "ember",
      credits: 3200,
      fuel: HULL.fuelMax,
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      prices: {},
      log: "Skiff-7 cleared Ember Reach. Buy low. Sell elsewhere.",
    };
  }

  function cargoUsed(st) {
    return Object.values(st.cargo).reduce((a, b) => a + b, 0);
  }

  function inventoryValue(st) {
    const s = sys(st.system);
    return GOODS.reduce((sum, g) => sum + (st.cargo[g.id] || 0) * (st.prices[g.id] || g.base), 0);
  }

  function netWorth(st) {
    return st.credits + inventoryValue(st);
  }

  function rollMarket(st) {
    const s = sys(st.system);
    st.prices = {};
    GOODS.forEach((g) => { st.prices[g.id] = price(s, g); });
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || !st.v) return null;
      st.v = VERSION;
      return st;
    } catch (_) { return null; }
  }

  function save(st) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  }

  let state = load() || fresh();
  if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);

  const el = (id) => document.getElementById(id);
  const log = (msg) => { state.log = msg; el("log").textContent = msg; };

  function render() {
    const s = sys(state.system);
    el("sys-name").textContent = s.name;
    el("credits").textContent = "₩" + state.credits.toLocaleString();
    el("fuel").textContent = state.fuel + " / " + HULL.fuelMax;
    el("cargo").textContent = cargoUsed(state) + " / " + HULL.cargo;
    el("net").textContent = "₩" + netWorth(state).toLocaleString();
    el("log").textContent = state.log;

    const market = el("market");
    market.innerHTML = "";
    GOODS.forEach((g) => {
      const p = state.prices[g.id];
      const have = state.cargo[g.id] || 0;
      const qty = qtyFor(g.id);
      const row = document.createElement("div");
      row.className = "row";
      const info = document.createElement("div");
      info.className = "good";
      info.innerHTML = "<strong>" + g.name + "</strong><div class=\"have\">have " + have + " · ₩" + p + "</div>";
      const steppers = document.createElement("div");
      steppers.className = "qty";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "chip ghost qty-btn";
      minus.textContent = "−";
      minus.onclick = () => setQty(g.id, qty - 1);
      const qlab = document.createElement("span");
      qlab.className = "qty-val";
      qlab.textContent = String(qty);
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "chip ghost qty-btn";
      plus.textContent = "+";
      plus.onclick = () => setQty(g.id, qty + 1);
      steppers.appendChild(minus);
      steppers.appendChild(qlab);
      steppers.appendChild(plus);
      const buy = document.createElement("button");
      buy.className = "chip";
      buy.textContent = "Buy";
      buy.onclick = () => doBuy(g.id, qty);
      const sell = document.createElement("button");
      sell.className = "chip ghost";
      sell.textContent = "Sell";
      sell.onclick = () => doSell(g.id, qty);
      row.appendChild(info);
      row.appendChild(steppers);
      row.appendChild(buy);
      row.appendChild(sell);
      market.appendChild(row);
    });

    const routes = el("routes");
    routes.innerHTML = "";
    s.links.forEach((id) => {
      const t = sys(id);
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.style.width = "100%";
      btn.style.marginBottom = "6px";
      btn.textContent = "Jump → " + t.name + " (1 fuel)";
      btn.disabled = state.fuel < 1;
      btn.onclick = () => doTravel(id);
      routes.appendChild(btn);
    });

    const canRetire = s.retire && netWorth(state) >= RETIRE_NET;
    el("btn-retire").disabled = !canRetire;
    save(state);
  }

  const qtyMap = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
  function qtyFor(id) { return qtyMap[id] || 1; }
  function setQty(id, n) {
    qtyMap[id] = Math.max(1, Math.min(HULL.cargo, n | 0));
    render();
  }

  function doBuy(id, qty) {
    qty = Math.max(1, qty | 0);
    const p = state.prices[id];
    const room = HULL.cargo - cargoUsed(state);
    if (room <= 0) return log("Hold full.");
    const canPay = Math.floor(state.credits / p);
    const n = Math.min(qty, room, canPay);
    if (n < 1) return log("Not enough credits.");
    state.credits -= p * n;
    state.cargo[id] += n;
    log("Bought " + n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * n) + ".");
    render();
  }

  function doSell(id, qty) {
    qty = Math.max(1, qty | 0);
    const have = state.cargo[id] || 0;
    if (have < 1) return log("Nothing to sell.");
    const n = Math.min(qty, have);
    const p = state.prices[id];
    state.cargo[id] -= n;
    state.credits += p * n;
    log("Sold " + n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * n) + ".");
    render();
  }

  function doTravel(toId) {
    if (state.fuel < 1) return log("Dry tanks.");
    state.fuel -= 1;
    state.system = toId;
    rollMarket(state);
    log("Arrived " + sys(toId).name + ".");
    render();
    maybeEncounter();
  }

  function doRefuel() {
    const need = HULL.fuelMax - state.fuel;
    if (need <= 0) return log("Tanks full.");
    const cost = need * FUEL_PRICE;
    if (state.credits < cost) {
      const can = Math.floor(state.credits / FUEL_PRICE);
      if (can <= 0) return log("Can't afford fuel.");
      state.fuel += can;
      state.credits -= can * FUEL_PRICE;
      log("Partial refuel +" + can + " for ₩" + (can * FUEL_PRICE) + ".");
    } else {
      state.fuel = HULL.fuelMax;
      state.credits -= cost;
      log("Refueled for ₩" + cost + ".");
    }
    render();
  }

  function maybeEncounter() {
    const roll = Math.random();
    if (roll < 0.18) openEncounter("warden");
    else if (roll < 0.32) openEncounter("corsair");
  }

  const dlg = el("encounter");
  let encKind = null;

  function openEncounter(kind) {
    encKind = kind;
    if (kind === "warden") {
      el("enc-title").textContent = "Ledger Wardens";
      el("enc-body").textContent = "A patrol lock. They want a ₩400 inspection fine — or you can try to talk past them.";
      el("enc-a").textContent = "Pay fine";
      el("enc-b").textContent = "Bluff";
    } else {
      el("enc-title").textContent = "Ash Corsairs";
      el("enc-body").textContent = "Raiders on the lane. Dump 2 random cargo units, or burn 1 fuel fleeing.";
      el("enc-a").textContent = "Dump cargo";
      el("enc-b").textContent = "Flee (−1 fuel)";
    }
    dlg.showModal();
  }

  function resolveEncounter(choice) {
    dlg.close();
    if (encKind === "warden") {
      if (choice === "a") {
        const fine = Math.min(state.credits, 400);
        state.credits -= fine;
        log("Paid Wardens ₩" + fine + ".");
      } else if (Math.random() < 0.55) {
        log("Bluff held. Wardens wave you on.");
      } else {
        const fine = Math.min(state.credits, 700);
        state.credits -= fine;
        log("Bluff failed. Fine ₩" + fine + ".");
      }
    } else {
      if (choice === "a") {
        let dumped = 0;
        const ids = GOODS.map((g) => g.id);
        while (dumped < 2) {
          const held = ids.filter((id) => state.cargo[id] > 0);
          if (!held.length) break;
          const id = held[Math.floor(Math.random() * held.length)];
          state.cargo[id] -= 1;
          dumped += 1;
        }
        log(dumped ? ("Corsairs took " + dumped + " cargo.") : "Hold empty — they laugh and leave.");
      } else if (state.fuel >= 1) {
        state.fuel -= 1;
        log("Fled. −1 fuel.");
      } else {
        state.credits = Math.max(0, state.credits - 250);
        log("No fuel to flee. They shake you down ₩250.");
      }
    }
    encKind = null;
    render();
  }

  el("enc-a").onclick = () => resolveEncounter("a");
  el("enc-b").onclick = () => resolveEncounter("b");
  el("btn-refuel").onclick = doRefuel;
  el("btn-retire").onclick = () => {
    if (!(sys(state.system).retire && netWorth(state) >= RETIRE_NET)) return;
    log("Retired on Quiet Moon. Net ₩" + netWorth(state).toLocaleString() + ". Victory.");
    alert("You retire on Quiet Moon. Game clear — New starts a fresh captain.");
  };
  el("btn-reset").onclick = () => {
    if (!confirm("Wipe save and start fresh?")) return;
    state = fresh();
    rollMarket(state);
    render();
  };

  render();
})();
