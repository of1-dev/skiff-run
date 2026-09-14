/**
 * Skiff Run — market / net worth / lane edge (pure, ATDD).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffMarket = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RETIRE_NET = 35000;

  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function priceFor(system, good) {
    const m = system.mods[good.id] || 1;
    const size = system.size == null ? 2 : system.size;
    const sizeMul = (100 - size * 3) / 100;
    const h = hash32(system.id + ":" + good.id);
    const jitter = 0.92 + ((h % 160) / 1000);
    return Math.max(8, Math.round(good.base * m * sizeMul * jitter));
  }

  function cargoUsed(cargo) {
    return Object.values(cargo || {}).reduce((a, b) => a + b, 0);
  }

  function inventoryValue(st, goods) {
    return goods.reduce((sum, g) => sum + (st.cargo[g.id] || 0) * (st.prices[g.id] || g.base), 0);
  }

  function shipValue(shipId, ships) {
    const s = ships.find((x) => x.id === shipId);
    return (s && s.price) || 0;
  }

  function netWorth(st, goods, ships) {
    return st.credits + inventoryValue(st, goods) + Math.floor(shipValue(st.shipId, ships) * 0.5);
  }

  function applyBuy(opts) {
    const qty = Math.max(1, opts.qty | 0);
    const p = opts.prices[opts.id];
    const used = cargoUsed(opts.cargo);
    const room = opts.holdMax - used;
    if (room <= 0) return { ok: false, reason: "hold_full", cargo: opts.cargo, credits: opts.credits };
    const canPay = Math.floor(opts.credits / p);
    const n = Math.min(qty, room, canPay);
    if (n < 1) return { ok: false, reason: "credits", cargo: opts.cargo, credits: opts.credits };
    const cargo = Object.assign({}, opts.cargo);
    cargo[opts.id] = (cargo[opts.id] || 0) + n;
    return { ok: true, n, cargo, credits: opts.credits - p * n };
  }

  function applySell(opts) {
    const qty = Math.max(1, opts.qty | 0);
    const have = opts.cargo[opts.id] || 0;
    if (have < 1) return { ok: false, reason: "empty", cargo: opts.cargo, credits: opts.credits };
    const n = Math.min(qty, have);
    const p = opts.prices[opts.id];
    const cargo = Object.assign({}, opts.cargo);
    cargo[opts.id] = have - n;
    return { ok: true, n, cargo, credits: opts.credits + p * n };
  }

  function applySellAll(opts) {
    let total = 0;
    let units = 0;
    const cargo = Object.assign({}, opts.cargo);
    opts.goods.forEach((g) => {
      const have = cargo[g.id] || 0;
      if (have < 1) return;
      const p = opts.prices[g.id];
      cargo[g.id] = 0;
      total += p * have;
      units += have;
    });
    if (units < 1) return { ok: false, reason: "empty", cargo, credits: opts.credits, total: 0, units: 0 };
    return { ok: true, cargo, credits: opts.credits + total, total, units };
  }

  function pickFillCheap(opts) {
    const goods = opts.goods || [];
    const prices = opts.prices || {};
    const avgs = opts.avgs || {};
    const cargo = opts.cargo || {};
    const credits = opts.credits | 0;
    const holdMax = opts.holdMax | 0;
    const room = holdMax - cargoUsed(cargo);
    if (room < 1) return { ok: false, reason: "nothing_cheap" };
    let best = null;
    goods.forEach((g) => {
      const local = prices[g.id];
      const avg = avgs[g.id];
      if (local == null || avg == null) return;
      const cue = marketCue(local, avg, cargo[g.id] || 0);
      if (cue.tone !== "buy") return;
      const n = Math.min(room, Math.floor(credits / local));
      if (n < 1) return;
      const savedPer = avg - local;
      const cand = { ok: true, id: g.id, name: g.name, n, price: local, savedPer };
      if (!best) {
        best = cand;
        return;
      }
      if (savedPer > best.savedPer || (savedPer === best.savedPer && n > best.n)) best = cand;
    });
    return best || { ok: false, reason: "nothing_cheap" };
  }

  function applyFillCheap(opts) {
    const pick = pickFillCheap(opts);
    if (!pick.ok) {
      return {
        ok: false,
        reason: pick.reason,
        cargo: opts.cargo,
        credits: opts.credits,
      };
    }
    const r = applyBuy({
      cargo: opts.cargo,
      credits: opts.credits,
      prices: opts.prices,
      holdMax: opts.holdMax,
      id: pick.id,
      qty: pick.n,
    });
    if (!r.ok) return r;
    return {
      ok: true,
      id: pick.id,
      name: pick.name,
      n: r.n,
      price: pick.price,
      savedPer: pick.savedPer,
      spent: pick.price * r.n,
      cargo: r.cargo,
      credits: r.credits,
    };
  }

  function applySellExpensive(opts) {
    const goods = opts.goods || [];
    const prices = opts.prices || {};
    const avgs = opts.avgs || {};
    let cargo = Object.assign({}, opts.cargo);
    let credits = opts.credits | 0;
    const sold = [];
    let total = 0;
    let units = 0;
    goods.forEach((g) => {
      const have = cargo[g.id] || 0;
      if (have < 1) return;
      const local = prices[g.id];
      const avg = avgs[g.id];
      if (local == null || avg == null) return;
      const cue = marketCue(local, avg, have);
      if (cue.tone !== "avoid") return;
      const r = applySell({ cargo, credits, prices, id: g.id, qty: have });
      if (!r.ok) return;
      cargo = r.cargo;
      credits = r.credits;
      const lineTotal = local * r.n;
      sold.push({ id: g.id, name: g.name, n: r.n, total: lineTotal });
      total += lineTotal;
      units += r.n;
    });
    if (units < 1) {
      return {
        ok: false,
        reason: "nothing_expensive",
        cargo: opts.cargo,
        credits: opts.credits,
        sold: [],
        total: 0,
        units: 0,
      };
    }
    return { ok: true, cargo, credits, sold, total, units };
  }

  function fillCheapLog(result) {
    if (!result || !result.ok) return "Nothing cheap here.";
    return "Filled cheap: " + result.n + " " + result.name + " for ₩" + result.spent + ".";
  }

  function sellExpensiveLog(result) {
    if (!result || !result.ok) return "Nothing expensive in hold.";
    const names = (result.sold || []).map((s) => s.n + " " + s.name).join(", ");
    return "Sold expensive: " + names + " for ₩" + result.total + ".";
  }

  function bestLaneEdge(herePrices, therePrices, goods) {
    let best = null;
    goods.forEach((g) => {
      const edge = therePrices[g.id] - herePrices[g.id];
      if (!best || edge > best.edge) best = { id: g.id, name: g.name, edge };
    });
    return best;
  }

  function bestDealHint(herePrices, therePrices, goods) {
    const best = bestLaneEdge(herePrices, therePrices, goods);
    if (!best || best.edge < 4) return "flat lane";
    return best.name + " +" + best.edge + "₩";
  }


  function galaxyAveragePrice(systems, good) {
    if (!systems || !systems.length) return good.base;
    let sum = 0;
    for (let i = 0; i < systems.length; i++) sum += priceFor(systems[i], good);
    return sum / systems.length;
  }

  function marketCue(localPrice, avgPrice, have) {
    const avg = avgPrice || 1;
    const ratio = localPrice / avg;
    if (ratio <= 0.92) return { tone: "buy", label: "Cheap — buy", ratio };
    if (ratio >= 1.08) {
      return { tone: "avoid", label: (have | 0) > 0 ? "Expensive — sell" : "Expensive — skip", ratio };
    }
    return { tone: "fair", label: "Fair", ratio };
  }

  function formatVsAvg(localPrice, avgPrice) {
    const avg = avgPrice || 1;
    const pct = Math.round(((localPrice - avg) / avg) * 100);
    if (pct === 0) return "at avg";
    return (pct > 0 ? "+" : "−") + Math.abs(pct) + "% vs avg";
  }

  return {
    RETIRE_NET,
    galaxyAveragePrice,
    marketCue,
    formatVsAvg,
    hash32,
    priceFor,
    cargoUsed,
    inventoryValue,
    shipValue,
    netWorth,
    applyBuy,
    applySell,
    applySellAll,
    pickFillCheap,
    applyFillCheap,
    applySellExpensive,
    fillCheapLog,
    sellExpensiveLog,
    bestLaneEdge,
    bestDealHint,
  };
});
