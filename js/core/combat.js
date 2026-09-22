(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffCombat = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function resolveEncounter(params) {
    const { state, encKind, dest, choice, GOODS, hull, cargoUsed, tickSkill, rand = Math.random } = params;
    let logMsg = "";
    
    function log(msg) { logMsg += (logMsg ? " " : "") + msg; }

    const armed = hull.weapons && state.crew > 0 && (state.ammo || 0) > 0;
    
    if (encKind === "warden") {
      if (choice === "a") {
        const fine = Math.min(state.credits, 400);
        state.credits -= fine;
        log("Paid Wardens ₩" + fine + ".");
      } else if (rand() < 0.55) {
        if (tickSkill) tickSkill("fighter", true);
        log("Bluff held. Wardens wave you on.");
      } else {
        const fine = Math.min(state.credits, 700);
        state.credits -= fine;
        log("Bluff failed. Fine ₩" + fine + ".");
      }
    } else if (encKind === "trader") {
      if (choice === "b") {
        log("Waved the trader off.");
      } else {
        const held = GOODS.map((g) => g.id).filter((id) => (state.cargo[id] || 0) > 0);
        if (held.length && rand() < 0.55) {
          const id = held[Math.floor(rand() * held.length)];
          const base = GOODS.find((g) => g.id === id).base;
          const p = Math.round((state.prices[id] || base) * 1.12);
          state.cargo[id] -= 1;
          state.credits += p;
          if (tickSkill) tickSkill("trader", true);
          log("Trader bought 1 " + GOODS.find((g) => g.id === id).name + " for ₩" + p + ".");
        } else {
          const g = GOODS[Math.floor(rand() * GOODS.length)];
          const room = hull.cargo - cargoUsed;
          const p = Math.round((state.prices[g.id] || g.base) * 0.88);
          if (room >= 1 && state.credits >= p) {
            state.credits -= p;
            state.cargo[g.id] = (state.cargo[g.id] || 0) + 1;
            log("Bought 1 " + g.name + " off a trader for ₩" + p + ".");
          } else {
            log("Trader had nothing you could take. Fair skies.");
          }
        }
      }
    } else if (armed && choice === "a") {
      const pir = (dest && dest.pirate) || 3;
      const ammoUsed = Math.min(state.ammo || 0, Math.floor(rand() * 3) + 1);
      state.ammo = Math.max(0, (state.ammo || 0) - ammoUsed);
      const odds = 0.55 + state.crew * 0.06 - pir * 0.03 + (ammoUsed * 0.05);
      
      if (rand() < odds) {
        const prize = 350 + state.crew * 150 + pir * 40;
        state.credits += prize;
        if (tickSkill) tickSkill("fighter", false);
        log(`Corsairs broke off. Salvage ₩${prize} (-${ammoUsed} ammo).`);
      } else {
        const dmg = 15 + pir * 5;
        state.hull = (state.hull || 0) - dmg;
        if (tickSkill) tickSkill("fighter", true);
        if (state.hull <= 0) {
          state.hull = 20;
          state.shipId = "mite";
          state.credits = 0;
          log("Ship destroyed! Escaped in a Mite with no credits.");
        } else {
          log(`Fight went bad. Hull took ${dmg} damage (-${ammoUsed} ammo).`);
        }
      }
    } else if (choice === "a") {
      let dumped = 0;
      const ids = GOODS.map((g) => g.id);
      const take = Math.min(3, 1 + Math.floor(((dest && dest.pirate) || 3) / 3));
      while (dumped < take) {
        const held = ids.filter((id) => state.cargo[id] > 0);
        if (!held.length) break;
        const id = held[Math.floor(rand() * held.length)];
        state.cargo[id] -= 1;
        dumped += 1;
      }
      log(dumped ? ("Corsairs took " + dumped + " cargo.") : "Hold empty — they laugh and leave.");
    } else {
      const burn = Math.min(state.fuel, 1 + (rand() < 0.35 ? 1 : 0));
      if (state.fuel >= 1) {
        state.fuel -= burn;
        log("Fled. −" + burn + " fuel.");
      } else {
        state.credits = Math.max(0, state.credits - 250);
        log("No fuel to flee. They shake you down ₩250.");
      }
    }
    return { state, logMsg };
  }

  return { resolveEncounter };
}));
