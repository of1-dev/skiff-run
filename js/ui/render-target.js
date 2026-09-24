/**
 * Skiff Run — Target system dossier renderer. (<= 100 lines)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffRenderTarget = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      el, sys, hull, ui,
      GOODS, dist, fuelCost, inRange, canJumpTo,
      peekPrices, bestDealHint, bestLaneEdge, activityLabel,
      isVisited, coursePlan, SIZE_NAME, TECH_NAME,
    } = ctx;
    function st() { return typeof ctx.getState === "function" ? ctx.getState() : ctx.state; }

    function renderTarget(opts) {
      const state = st();
      const canSeeTradeFn = (opts && opts.canSeeTrade) || ctx.canSeeTrade;
      const cargoMarginAtFn = (opts && opts.cargoMarginAt) || ctx.cargoMarginAt;
      const title = el("target-title");
      const meta = el("target-meta");
      const peekEl = el("target-peek");
      const dossier = el("target-dossier");
      const marginEl = el("target-margin");
      const warp = el("btn-warp");
      const id = ui.targetId;
      if (!id || id === state.system) {
        const here = sys(state.system);
        title.textContent = here.name + " (here)";
        meta.textContent = "Pick another system to jump.";
        if (dossier) {
          dossier.hidden = false;
          dossier.textContent =
            SIZE_NAME[here.size | 0] + " \u00b7 " + TECH_NAME[here.tech | 0] + " \u00b7 " + (here.gov || "\u2014") +
            "\nPolice " + activityLabel(here.police) + " \u00b7 Pirates " + activityLabel(here.pirate);
        }
        if (marginEl) marginEl.hidden = true;
        peekEl.textContent = "";
        warp.disabled = true;
        warp.textContent = "Jump";
        return;
      }
      const t = sys(id);
      const hullOk = inRange(state.system, id);
      const cost = fuelCost(state.system, id);
      const fuelOk = state.fuel >= cost;
      const reach = hullOk && fuelOk;
      const tradeOk = canSeeTradeFn ? canSeeTradeFn(id) : true;
      const peek = tradeOk ? peekPrices(id) : null;
      const hint = tradeOk ? bestDealHint(state.prices, peek) : "trade fogged (out of sector)";
      const visited = isVisited(id);
      title.textContent = t.name + (visited ? "" : " \u00b7 unvisited");
      meta.textContent = reach
        ? (cost + " fuel \u00b7 " + hint + (t.yard ? " \u00b7 yard" : "") + (t.retire ? " \u00b7 retire dock" : ""))
        : (!hullOk
          ? ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units \u00b7 hull " + hull().range + ")")
          : ("Need " + cost + " fuel (have " + state.fuel + ")"));
      if (dossier) {
        dossier.hidden = false;
        dossier.textContent =
          SIZE_NAME[t.size | 0] + " \u00b7 " + TECH_NAME[t.tech | 0] + " \u00b7 " + (t.gov || "\u2014") +
          "\nPolice " + activityLabel(t.police) + " \u00b7 Pirates " + activityLabel(t.pirate) +
          (visited ? "" : "\n(Resources still fogged \u2014 first dock reveals more later.)") +
          (tradeOk ? "" : "\nTrade prices unknown outside your sector \u2014 buy Dock Press or fly closer.");
      }
      if (marginEl) {
        if (!tradeOk) {
          marginEl.hidden = false;
          marginEl.textContent = "Trade fog \u2014 out of sector. No price peeks.";
          marginEl.className = "margin-line";
        } else {
          const hold = cargoMarginAtFn ? cargoMarginAtFn(id) : { units: 0, total: 0 };
          const lane = bestLaneEdge(state.prices, peek);
          marginEl.hidden = false;
          if (hold.units > 0) {
            const sign = hold.total >= 0 ? "+" : "";
            marginEl.textContent = "Hold vs here: " + sign + "\u20a9" + hold.total.toLocaleString() + " if sold there";
            marginEl.className = "margin-line " + (hold.total > 0 ? "good" : hold.total < 0 ? "bad" : "");
          } else if (lane) {
            const sign = lane.edge >= 0 ? "+" : "";
            marginEl.textContent = "Lane stub: buy " + lane.name + " here \u2192 " + sign + lane.edge + "\u20a9/u there";
            marginEl.className = "margin-line " + (lane.edge >= 4 ? "good" : lane.edge < 0 ? "bad" : "");
          } else {
            marginEl.textContent = "Lane stub: flat";
            marginEl.className = "margin-line";
          }
        }
      }
      peekEl.textContent = tradeOk
        ? GOODS.map(function (g) { return g.name.split(" ").pop() + " \u20a9" + peek[g.id]; }).join(" \u00b7 ")
        : "Prices fogged \u2014 leave sector to scout, or read the Press.";
      const plan = !reach ? coursePlan(id) : null;
      const hop = plan && plan.ok && plan.next ? sys(plan.next) : null;
      const hopOk = !!(hop && canJumpTo(state.system, hop.id));
      warp.disabled = !(reach || hopOk);
      if (reach) warp.textContent = "Jump \u2212" + cost + " fuel";
      else if (hopOk) warp.textContent = "Hop via " + hop.name + " \u00b7 " + plan.jumps + " jumps";
      else warp.textContent = !hullOk ? "Out of range" : "Need fuel";
    }

    return { renderTarget };
  }

  return { setup };
});
