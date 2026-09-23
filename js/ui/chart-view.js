/**
 * Skiff Run — Chart view modes and waypoint chrome.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffChartView = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const el = ctx.el;
    const ui = ctx.getUi();

    function showTab(name) {
      ui.tab = name;
      if (typeof document !== "undefined") {
        document.querySelectorAll(".panel").forEach(function (p) {
          const on = p.dataset.tab === name;
          p.hidden = !on;
          p.classList.toggle("active", on);
        });
        document.querySelectorAll(".tabbar .tab").forEach(function (b) {
          b.classList.toggle("active", b.dataset.tab === name);
        });
      }
      if (name === "chart") {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(function () { ctx.sizeMap(); ctx.drawMap(); });
        } else {
          ctx.sizeMap(); ctx.drawMap();
        }
      }
    }

    function setChartMode(mode) {
      if (mode !== "local" && mode !== "sector" && mode !== "full") mode = "local";
      ui.chartMode = mode;
      if (el("mode-local")) el("mode-local").classList.toggle("active", mode === "local");
      if (el("mode-sector")) el("mode-sector").classList.toggle("active", mode === "sector");
      const fullBtn = el("mode-full");
      if (fullBtn) fullBtn.classList.toggle("active", mode === "full");
      const hint = el("chart-hint");
      if (hint) {
        hint.textContent = mode === "local"
          ? "Local: systems inside your fuel reach circle (like Palm ST). Tap to target, then Jump."
          : mode === "sector"
            ? "Sector: regional window (~" + ctx.SECTOR_RADIUS + " units). Dim = beyond current fuel reach."
            : "Full: entire Ember galaxy (" + ctx.systems().length + " systems). Dim = beyond current fuel reach.";
      }
      ctx.drawMap();
      ctx.renderTarget();
    }

    function renderWaypointChrome() {
      const box = el("waypoint-list");
      const pinBtn = el("btn-waypoint");
      const st = ctx.getState();
      const ids = ctx.WP.normalize(st.waypoints);
      if (pinBtn) {
        const targeted = ui.targetId && ui.targetId !== st.system;
        const pinned = targeted && ctx.WP.isPinned(ids, ui.targetId);
        pinBtn.textContent = pinned ? "Unpin" : "Pin";
        pinBtn.disabled = false;
      }
      if (!box) return;
      box.innerHTML = "";
      if (!ids.length) {
        box.textContent = "No pins. Target a dock (not this one), then Pin. Numbered dots show on the chart.";
        return;
      }
      const label = document.createElement("div");
      label.textContent = "Pins — tap to target:";
      box.appendChild(label);
      ids.forEach(function (id, i) {
        const s = ctx.sys(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip wp-jump";
        b.textContent = (i + 1) + " · " + (s ? s.name : id);
        b.onclick = function () {
          ui.targetId = id;
          ui.searchHitId = id;
          setChartMode(ctx.CF.viewForLead({
            hereId: st.system,
            targetId: id,
            canJump: ctx.canJumpTo(st.system, id),
            inSector: ctx.inSector(st.system, id),
          }));
          if (globalThis.SkiffHoloRenderer && typeof globalThis.SkiffHoloRenderer.selectSystem === "function") {
            globalThis.SkiffHoloRenderer.selectSystem(id);
          }
          ctx.renderTarget();
          ctx.drawMap();
        };
        box.appendChild(b);
      });
    }

    return {
      showTab: showTab,
      setChartMode: setChartMode,
      renderWaypointChrome: renderWaypointChrome,
    };
  }

  return { setup: setup };
});
