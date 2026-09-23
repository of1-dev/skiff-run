/**
 * Skiff Run — Agent API implementation.
 * Exposes window.SkiffAPI methods used by WebMCP and external agent seats.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffAgentAPI = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createAPI(ctx) {
    const {
      VERSION,
      getState,
      sys,
      hull,
      cargoUsed,
      netWorth,
      currentPilot,
      applyPilot,
      logAgentAct,
      withLocalEval,
      doBuy,
      doSell,
      doSellAll,
      doFillCheap,
      doRepair,
      doRearm,
      doSellExpensive,
      doRefuel,
      doTravel,
      doDockWork,
      doBuyPress,
      doBuyShip,
      resolveEncounter,
      getEncKind,
      getEncDest,
      RETIRE_NET,
      el,
      getSystems,
      inRange,
      fuelCost,
    } = ctx;

    return {
      VERSION: VERSION,
      getState: function () {
        const state = getState();
        const h = hull();
        const s = sys(state.system);
        const ek = typeof getEncKind === "function" ? getEncKind() : null;
        const ed = typeof getEncDest === "function" ? getEncDest() : null;
        return {
          system: state.system,
          systemName: (s || {}).name,
          credits: state.credits,
          fuel: state.fuel,
          fuelMax: h.fuelMax,
          ship: h,
          cargo: Object.assign({}, state.cargo),
          cargoUsed: cargoUsed(state),
          cargoMax: h.cargo,
          prices: Object.assign({}, state.prices),
          netWorth: netWorth(state),
          pilot: currentPilot(),
          dockWorkAvailable: state.dockWorkAt !== state.system,
          pressAvailable: state.pressBoughtAt !== state.system,
          canRetire: !!(s && s.retire && netWorth(state) >= RETIRE_NET),
          pendingEncounter: ek ? { kind: ek, systemId: (ed ? ed.id : state.system) } : null,
          agentLog: Array.isArray(state.agentLog) ? state.agentLog.slice() : [],
        };
      },
      getChart: function (mode) {
        const state = getState();
        const from = state.system;
        const list = getSystems().map(function (s) {
          const dist = Math.hypot((s.x || 0) - ((sys(from) || {}).x || 0), (s.y || 0) - ((sys(from) || {}).y || 0));
          const inJmp = inRange(from, s.id);
          const cost = fuelCost(from, s.id);
          return {
            id: s.id,
            name: s.name,
            distance: Math.round(dist * 10) / 10,
            inRange: inJmp,
            fuelCost: cost,
            canJump: inJmp && state.fuel >= cost,
            yard: !!s.yard,
            pirate: s.pirate,
            police: s.police,
          };
        });
        return mode === "local" ? list.filter(function (s) { return s.inRange; }) : list;
      },
      claim: function () {
        applyPilot("agent", true);
        const res = { ok: true, pilot: "agent", log: "Agent claimed the stick." };
        logAgentAct("claim", res);
        return res;
      },
      release: function () {
        applyPilot("human", true);
        const res = { ok: true, pilot: "human", log: "Agent released the stick." };
        logAgentAct("release", res);
        return res;
      },
      buy: function (goodId, qty) {
        const state = getState();
        const prevCredits = state.credits;
        const q = qty || 1;
        withLocalEval(() => {
          for (let i = 0; i < q; i++) doBuy(goodId);
        });
        const bought = Math.floor((prevCredits - state.credits) / (state.prices[goodId] || 1));
        const ok = bought > 0;
        const res = {
          ok: ok,
          good: goodId,
          qty: bought,
          spent: prevCredits - state.credits,
          log: ok ? ("Bought " + bought + " " + goodId) : "Buy failed",
        };
        logAgentAct("buy", res);
        return res;
      },
      sell: function (goodId, qty) {
        const state = getState();
        const prevCredits = state.credits;
        const q = qty || 1;
        withLocalEval(() => {
          for (let i = 0; i < q; i++) doSell(goodId);
        });
        const sold = Math.floor((state.credits - prevCredits) / (state.prices[goodId] || 1));
        const ok = sold > 0;
        const res = {
          ok: ok,
          good: goodId,
          qty: sold,
          earned: state.credits - prevCredits,
          log: ok ? ("Sold " + sold + " " + goodId) : "Sell failed",
        };
        logAgentAct("sell", res);
        return res;
      },
      sellAll: function () {
        const state = getState();
        const prevCredits = state.credits;
        const prevUsed = cargoUsed(state);
        withLocalEval(() => doSellAll());
        const sold = prevUsed - cargoUsed(state);
        const ok = sold > 0;
        const res = {
          ok: ok,
          unitsSold: sold,
          earned: state.credits - prevCredits,
          log: ok ? ("Sold all " + sold + " units for ₩" + (state.credits - prevCredits).toLocaleString()) : "Hold was empty",
        };
        logAgentAct("sell_all", res);
        return res;
      },
      fillCheap: function () {
        const state = getState();
        const prevCredits = state.credits;
        const prevUsed = cargoUsed(state);
        withLocalEval(() => doFillCheap());
        const loaded = cargoUsed(state) - prevUsed;
        const ok = loaded > 0;
        const res = {
          ok: ok,
          unitsLoaded: loaded,
          spent: prevCredits - state.credits,
          log: ok ? ("Filled " + loaded + " units cheap") : "Nothing cheap loaded",
        };
        logAgentAct("fill_cheap", res);
        return res;
      },
      repair: function () {
        const state = getState();
        const prev = state.hull || 0;
        withLocalEval(() => doRepair());
        const res = {
          ok: (state.hull || 0) > prev,
          repaired: (state.hull || 0) - prev,
          log: `Repaired ${(state.hull || 0) - prev} hull points.`,
        };
        logAgentAct("repair", res);
        return res;
      },
      rearm: function () {
        const state = getState();
        const prev = state.ammo || 0;
        withLocalEval(() => doRearm());
        const res = {
          ok: (state.ammo || 0) > prev,
          loaded: (state.ammo || 0) - prev,
          log: `Loaded ${(state.ammo || 0) - prev} ordnance.`,
        };
        logAgentAct("rearm", res);
        return res;
      },
      sellExpensive: function () {
        const state = getState();
        const prevCredits = state.credits;
        const prevUsed = cargoUsed(state);
        withLocalEval(() => doSellExpensive());
        const sold = prevUsed - cargoUsed(state);
        const ok = sold > 0;
        const res = {
          ok: ok,
          unitsSold: sold,
          earned: state.credits - prevCredits,
          log: ok ? ("Sold " + sold + " units for ₩" + (state.credits - prevCredits).toLocaleString() + " at premium") : "Nothing expensive in hold",
        };
        logAgentAct("sell_expensive", res);
        return res;
      },
      refuel: function () {
        const state = getState();
        const prevFuel = state.fuel;
        withLocalEval(() => doRefuel());
        const added = state.fuel - prevFuel;
        const ok = added > 0;
        const res = {
          ok: ok,
          fuelAdded: added,
          log: ok ? ("Refueled +" + added) : "Tanks full or cannot afford",
        };
        logAgentAct("refuel", res);
        return res;
      },
      jump: function (destId) {
        const state = getState();
        const from = state.system;
        withLocalEval(() => doTravel(destId));
        const ok = state.system === destId;
        const res = {
          ok: ok,
          from: from,
          system: state.system,
          log: ok ? ("Jumped to " + (sys(state.system) || {}).name) : "Jump failed",
        };
        logAgentAct("jump", res);
        return res;
      },
      dockWork: function () {
        const state = getState();
        const prevCredits = state.credits;
        withLocalEval(() => doDockWork());
        const earned = state.credits - prevCredits;
        const ok = earned > 0;
        const res = { ok: ok, earned: earned, log: ok ? "Worked the docks" : "Already worked" };
        logAgentAct("dock_work", res);
        return res;
      },
      buyPress: function () {
        const state = getState();
        const prevCredits = state.credits;
        withLocalEval(() => doBuyPress());
        const ok = state.credits < prevCredits;
        const res = { ok: ok, log: ok ? "Bought the Dock Press" : "Could not buy press" };
        logAgentAct("buy_press", res);
        return res;
      },
      buyShip: function (shipId) {
        const state = getState();
        const oldId = state.shipId;
        withLocalEval(() => doBuyShip(shipId));
        const ok = state.shipId === shipId && oldId !== shipId;
        const res = { ok: ok, log: ok ? ("Traded hull for " + shipId) : "Ship trade failed" };
        logAgentAct("buy_ship", res);
        return res;
      },
      resolveEncounter: function (choice) {
        const ek = typeof getEncKind === "function" ? getEncKind() : null;
        if (!ek) return { ok: false, error: "no_active_encounter" };
        const had = ek;
        resolveEncounter(choice);
        const res = {
          ok: true,
          resolved: had,
          choice: choice,
          log: "Encounter resolved (" + choice + ")",
        };
        logAgentAct("encounter", res);
        return res;
      },
      retire: function () {
        const state = getState();
        const s = sys(state.system);
        const canRetire = s && s.retire && netWorth(state) >= RETIRE_NET;
        if (!canRetire) return { ok: false, error: "cannot_retire" };
        const b = el("btn-retire");
        if (b) b.click();
        const res = { ok: true, retired: true, log: "Retired on Quiet Moon!" };
        logAgentAct("retire", res);
        return res;
      },
    };
  }

  return { createAPI };
});
