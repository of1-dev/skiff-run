/**
 * Skiff Run — Dock Press (ST newspaper homage). Pure ATDD target.
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

  function rollEdition(opts) {
    const { hereId, systems, goods, priceFor, rand } = opts;
    const rnd = rand || Math.random;
    const here = systems.find((s) => s.id === hereId) || systems[0];
    const masthead = "Dock Press — " + (here && here.name ? here.name : "Unknown dock");

    const lines = [];
    const others = systems.filter((s) => s.id !== hereId);

    // Tip 1: goods cheap/dear somewhere
    if (goods.length && others.length) {
      const g = pick(goods, rnd);
      const ranked = others
        .map((s) => ({ s, p: priceFor(s, g) }))
        .sort((a, b) => a.p - b.p);
      if (rnd() < 0.5) {
        const cheap = ranked[0];
        lines.push(
          "Traders whisper " + g.name + " is cheap at " + cheap.s.name + " (list ~₩" + cheap.p + ")."
        );
      } else {
        const dear = ranked[ranked.length - 1];
        lines.push(
          "Bulletin: " + g.name + " runs expensive at " + dear.s.name + " (list ~₩" + dear.p + ")."
        );
      }
    }

    // Tip 2: heat / yard / dry
    const hot = others.filter((s) => (s.pirate | 0) >= 5);
    const yard = others.filter((s) => s.yard);
    if (hot.length && rnd() < 0.55) {
      const s = pick(hot, rnd);
      lines.push("Corsair traffic thick near " + s.name + " — fat holds, keep eyes open.");
    } else if (yard.length) {
      const s = pick(yard, rnd);
      lines.push("Yard slips open at " + s.name + " — hulls and bunks if your ledger holds.");
    } else {
      lines.push("Lane quiet. Refuel, shift docks, listen for the next edition.");
    }

    // Tip 3: quest-lead stub (flavor now; unlock wiring later)
    if (rnd() < 0.65 && others.length) {
      const s = pick(others, rnd);
      const leads = [
        "Wanted notice: courier run ending at " + s.name + " — ask the dock clerk if you pass through.",
        "Classified: a quiet captain is hiring for a hop near " + s.name + ".",
        "Rumor: someone at " + s.name + " will pay for a sealed crate, no questions.",
      ];
      lines.push(pick(leads, rnd));
    }

    while (lines.length < 2) {
      lines.push("Weather fax blank. The Press still took your credits.");
    }
    if (lines.length > 3) lines.length = 3;

    return { masthead, lines, price: PRESS_PRICE };
  }

  return { PRESS_PRICE, buyPress, rollEdition };
});
