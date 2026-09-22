/**
 * Skiff Run — Dock Press (ST newspaper homage). Pure ATDD target.
 * Tips are structured: { text, action } so the UI can deep-link.
 * action: { type: "chart"|"market"|"yard"|"quest", systemId?, goodId? }
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffDockPress = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PRESS_PRICE = 75;

  function buyPress(opts) {
    const { credits, pressBoughtAt, systemId } = opts;
    if (pressBoughtAt === systemId) {
      return { ok: false, reason: "already", credits, pressBoughtAt };
    }
    if (credits < PRESS_PRICE) {
      return { ok: false, reason: "credits", credits, pressBoughtAt };
    }
    return {
      ok: true,
      credits: credits - PRESS_PRICE,
      pressBoughtAt: systemId,
      paid: PRESS_PRICE,
    };
  }

  function pick(arr, rand) {
    return arr[Math.floor(rand() * arr.length) % arr.length];
  }

  function tip(text, action) {
    return { text: text, action: action || null };
  }

  function rollEdition(opts) {
    const { hereId, systems, goods, priceFor, rand } = opts;
    const rnd = rand || Math.random;
    const here = systems.find((s) => s.id === hereId) || systems[0];
    const masthead = "Dock Press — " + (here && here.name ? here.name : "Unknown dock");

    const tips = [];
    const others = systems.filter((s) => s.id !== hereId);

    // Tip 1: goods cheap/expensive somewhere → chart that system + market flavor
    if (goods.length && others.length) {
      const g = pick(goods, rnd);
      const ranked = others
        .map((s) => ({ s, p: priceFor(s, g) }))
        .sort((a, b) => a.p - b.p);
      if (rnd() < 0.5) {
        const cheap = ranked[0];
        tips.push(tip(
          "Traders whisper " + g.name + " is cheap at " + cheap.s.name + " (list ~₩" + cheap.p + ").",
          { type: "chart", systemId: cheap.s.id, goodId: g.id }
        ));
      } else {
        const dear = ranked[ranked.length - 1];
        tips.push(tip(
          "Bulletin: " + g.name + " runs expensive at " + dear.s.name + " (list ~₩" + dear.p + ").",
          { type: "chart", systemId: dear.s.id, goodId: g.id }
        ));
      }
    }

    // Tip 2: heat / yard / quiet
    const hot = others.filter((s) => (s.pirate | 0) >= 5);
    const yard = others.filter((s) => s.yard);
    if (hot.length && rnd() < 0.55) {
      const s = pick(hot, rnd);
      tips.push(tip(
        "Corsair traffic thick near " + s.name + " — fat holds, keep eyes open.",
        { type: "chart", systemId: s.id }
      ));
    } else if (yard.length) {
      const s = pick(yard, rnd);
      tips.push(tip(
        "Yard slips open at " + s.name + " — hulls and bunks if your ledger holds.",
        { type: "yard", systemId: s.id }
      ));
    } else {
      tips.push(tip(
        "Lane quiet. Refuel, shift docks, listen for the next edition.",
        { type: "market" }
      ));
    }

    // Tip 3: quest-lead stub
    if (rnd() < 0.65 && others.length) {
      const s = pick(others, rnd);
      const leads = [
        "Wanted notice: courier run ending at " + s.name + " — ask the dock clerk if you pass through.",
        "Classified: a quiet captain is hiring for a hop near " + s.name + ".",
        "Rumor: someone at " + s.name + " will pay for a sealed crate, no questions.",
      ];
      tips.push(tip(pick(leads, rnd), { type: "quest", systemId: s.id }));
    }

    while (tips.length < 2) {
      tips.push(tip("Weather fax blank. The Press still took your credits.", { type: "market" }));
    }
    if (tips.length > 3) tips.length = 3;

    // lines[] kept for older saves / simple display
    const lines = tips.map((t) => t.text);
    return { masthead, tips, lines, price: PRESS_PRICE };
  }

  /** Normalize saved edition (string lines → tips without actions). */
  function normalizeEdition(edition) {
    if (!edition) return null;
    if (Array.isArray(edition.tips) && edition.tips.length) return edition;
    const lines = edition.lines || [];
    const tips = lines.map((text) => tip(typeof text === "string" ? text : String(text), null));
    return Object.assign({}, edition, { tips, lines: tips.map((t) => t.text) });
  }


  /** Map a tip action to a UI command. Pure — no DOM. */
  function resolvePressAction(action, opts) {
    const o = opts || {};
    const hereId = o.hereId || null;
    const act = action && typeof action === "object" ? action : null;
    if (!act || !act.type) {
      return { ok: false, reason: "dead", tab: null, targetId: null, chartMode: null, log: "That lead is dead ink." };
    }
    const sid = act.systemId || null;
    if (act.type === "market") {
      return { ok: true, tab: "dock", targetId: null, chartMode: null, log: "Press sent you back to the market board." };
    }
    if (act.type === "yard") {
      if (sid && hereId && sid === hereId) {
        return { ok: true, tab: "yard", targetId: null, chartMode: null, log: "Yard slips — this dock." };
      }
      return { ok: true, tab: "chart", targetId: sid, chartMode: "sector", log: sid ? ("Yard lead pinned. Jump to trade hulls.") : "Yard lead, no dock named." };
    }
    if (act.type === "chart" || act.type === "quest") {
      if (!sid) {
        return { ok: false, reason: "no_system", tab: "chart", targetId: null, chartMode: "sector", log: "Press named no dock." };
      }
      const kind = act.type === "quest" ? "Job lead" : "Press lead";
      return { ok: true, tab: "chart", targetId: sid, chartMode: "sector", pin: true, log: kind };
    }
    return { ok: false, reason: "unknown", tab: null, targetId: null, chartMode: null, log: "Can't follow that clip." };
  }

  return { PRESS_PRICE, buyPress, rollEdition, tip, normalizeEdition, resolvePressAction };
});
