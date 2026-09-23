/**
 * Skiff Run — Market trading actions (buy, sell, fill cheap, sell expensive).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffMarketActions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    function state() { return ctx.getState(); }
    function bridgeOn() { return !!ctx.getBridgeOn(); }
    function currentPilot() { return ctx.currentPilot(); }

    function doBuy(id, qty) {
      if (bridgeOn() && currentPilot() === "agent") return ctx.log("Agent has the stick.");
      const st = state();
      const r = ctx.SM.applyBuy({
        cargo: st.cargo, credits: st.credits, prices: st.prices,
        goods: ctx.GOODS, holdMax: ctx.hull().cargo, id: id, qty: qty,
      });
      if (!r.ok) return ctx.log(r.reason === "hold_full" ? "Hold full." : "Not enough credits.");
      st.credits = r.credits;
      st.cargo = r.cargo;
      const p = st.prices[id];
      ctx.log("Bought " + r.n + " " + ctx.GOODS.find(function (g) { return g.id === id; }).name + " for ₩" + (p * r.n) + ".");
      ctx.tickSkill("trader", true);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doSell(id, qty) {
      if (bridgeOn() && currentPilot() === "agent") return ctx.log("Agent has the stick.");
      const st = state();
      const r = ctx.SM.applySell({
        cargo: st.cargo, credits: st.credits, prices: st.prices,
        goods: ctx.GOODS, id: id, qty: qty,
      });
      if (!r.ok) return ctx.log("Nothing to sell.");
      st.credits = r.credits;
      st.cargo = r.cargo;
      const p = st.prices[id];
      ctx.log("Sold " + r.n + " " + ctx.GOODS.find(function (g) { return g.id === id; }).name + " for ₩" + (p * r.n) + ".");
      ctx.tickSkill("trader", true);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doSellAll() {
      if (bridgeOn() && currentPilot() === "agent") return ctx.log("Agent has the stick.");
      const st = state();
      const r = ctx.SM.applySellAll({
        cargo: st.cargo, credits: st.credits, prices: st.prices, goods: ctx.GOODS,
      });
      if (!r.ok) return ctx.log("Hold empty.");
      st.credits = r.credits;
      st.cargo = r.cargo;
      ctx.log("Sold all (" + r.units + " units) for ₩" + r.total.toLocaleString() + ".");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function galaxyAvgs() {
      return Object.fromEntries(ctx.GOODS.map(function (g) {
        return [g.id, ctx.SM.galaxyAveragePrice(ctx.systems(), g)];
      }));
    }

    function doFillCheap() {
      if (bridgeOn() && currentPilot() === "agent") return ctx.log("Agent has the stick.");
      const st = state();
      const r = ctx.SM.applyFillCheap({
        cargo: st.cargo, credits: st.credits, prices: st.prices,
        goods: ctx.GOODS, holdMax: ctx.hull().cargo, avgs: galaxyAvgs(),
      });
      ctx.log(ctx.SM.fillCheapLog(r));
      if (!r.ok) return;
      st.credits = r.credits;
      st.cargo = r.cargo;
      ctx.tickSkill("trader", true);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doSellExpensive() {
      if (bridgeOn() && currentPilot() === "agent") return ctx.log("Agent has the stick.");
      const st = state();
      const r = ctx.SM.applySellExpensive({
        cargo: st.cargo, credits: st.credits, prices: st.prices,
        goods: ctx.GOODS, avgs: galaxyAvgs(),
      });
      ctx.log(ctx.SM.sellExpensiveLog(r));
      if (!r.ok) return;
      st.credits = r.credits;
      st.cargo = r.cargo;
      ctx.tickSkill("trader", true);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    return {
      doBuy: doBuy,
      doSell: doSell,
      doSellAll: doSellAll,
      doFillCheap: doFillCheap,
      doSellExpensive: doSellExpensive,
      galaxyAvgs: galaxyAvgs,
    };
  }

  return { setup: setup };
});
