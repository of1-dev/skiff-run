/**
 * Skiff Run — chart find, press leads, and the multi-hop course.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffChartInteractions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    function state() { return ctx.getState(); }
    function ui() { return ctx.getUi(); }

    function courseDest() {
      const st = state();
      const view = ui();
      const pins = ctx.WP.normalize(st.waypoints);
      const far = pins.find(function (id) { return id && id !== st.system; });
      if (far) return far;
      if (view.courseDest && view.courseDest !== st.system) return view.courseDest;
      if (view.targetId && view.targetId !== st.system) return view.targetId;
      return null;
    }

    function coursePlan(destId) {
      if (!destId) return null;
      const st = state();
      return ctx.RT.shortestPath(st.system, destId, ctx.systems(), ctx.hull().range);
    }

    function applyChartLead(id, why) {
      const st = state();
      const view = ui();
      if (!id || id === st.system) return false;
      const dest = ctx.sys(id);
      if (!dest) return false;
      view.targetId = id;
      view.searchHitId = id;
      view.courseDest = id;
      const hint = ctx.WP.pinHint({ targetId: id, hereId: st.system });
      if (hint.ok && !ctx.WP.isPinned(st.waypoints, id)) {
        const tog = ctx.WP.toggle(st.waypoints, id);
        st.waypoints = tog.list;
      }
      const mode = ctx.CF.viewForLead({
        hereId: st.system,
        targetId: id,
        canJump: ctx.canJumpTo(st.system, id),
        inSector: ctx.inSector(st.system, id),
      });
      ctx.setChartMode(mode);
      if (globalThis.SkiffHoloRenderer && typeof globalThis.SkiffHoloRenderer.selectSystem === "function") {
        globalThis.SkiffHoloRenderer.selectSystem(id);
      }
      const plan = coursePlan(id);
      const hops = plan && plan.ok ? plan.jumps : "?";
      const nm = dest.name || id;
      ctx.log((why || "Lead") + " → " + nm + " pinned · " + hops + " hop(s). Jump / Hop via.");
      return true;
    }

    function followPressTip(action) {
      const st = state();
      const r = globalThis.SkiffDockPress.resolvePressAction(action, { hereId: st.system });
      if (r.targetId) {
        applyChartLead(r.targetId, r.log || "Press lead");
        ctx.showTab("chart");
      } else if (r.log) {
        ctx.log(r.log);
        if (r.tab) ctx.showTab(r.tab);
      }
      ctx.save(st);
      ctx.render();
    }

    function runChartSearch(raw) {
      const st = state();
      const view = ui();
      const hits = ctx.CF.findSystems(ctx.systems(), raw);
      const best = ctx.CF.pickBest(hits, raw);
      if (!best) {
        ctx.log("No dock matches “" + String(raw || "").trim() + "”.");
        return;
      }
      view.targetId = best.id;
      view.searchHitId = best.id;
      const mode = ctx.CF.viewForLead({
        hereId: st.system,
        targetId: best.id,
        canJump: ctx.canJumpTo(st.system, best.id),
        inSector: ctx.inSector(st.system, best.id),
      });
      ctx.setChartMode(mode);
      const extra = hits.length > 1 ? (" (— " + hits.length + " hits)") : "";
      ctx.log("Chart found " + best.name + extra + ".");
      if (globalThis.SkiffHoloRenderer && typeof globalThis.SkiffHoloRenderer.selectSystem === "function") {
        globalThis.SkiffHoloRenderer.selectSystem(best.id);
      }
      ctx.showTab("chart");
      ctx.render();
    }

    return {
      courseDest: courseDest,
      coursePlan: coursePlan,
      applyChartLead: applyChartLead,
      followPressTip: followPressTip,
      runChartSearch: runChartSearch,
    };
  }

  return { setup: setup };
});
