/**
 * Skiff Run — Event listeners and DOM click bindings.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffDomWire = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    if (typeof document === "undefined") return;

    const el = ctx.el;
    const ui = ctx.getUi();

    if (el("btn-refuel")) el("btn-refuel").onclick = ctx.doRefuel;
    if (el("btn-repair")) el("btn-repair").onclick = ctx.doRepair;
    if (el("btn-rearm")) el("btn-rearm").onclick = ctx.doRearm;
    if (el("btn-sell-all")) el("btn-sell-all").onclick = ctx.doSellAll;
    if (el("btn-fill-cheap")) el("btn-fill-cheap").onclick = ctx.doFillCheap;
    if (el("btn-sell-expensive")) el("btn-sell-expensive").onclick = ctx.doSellExpensive;

    function travelRoute(targetId) {
      const st = ctx.getState();
      const goal = targetId || ui.targetId;
      if (!goal || goal === st.system) return;
      while (st.system !== goal) {
        const prev = st.system;
        ctx.doTravel(goal);
        if (st.system === prev) break;
        if (typeof document !== "undefined" && document.body && document.body.classList && document.body.classList.contains("enc-open")) break;
        const encDlg = typeof el === "function" ? el("encounter") : null;
        if (encDlg && encDlg.open) break;
      }
    }

    if (el("btn-warp")) {
      el("btn-warp").onclick = function () {
        ctx.reclaimStick();
        const st = ctx.getState();
        if (!ui.targetId || ui.targetId === st.system) {
          ctx.log("Pick a dock on the chart, then Jump.");
          return;
        }
        travelRoute(ui.targetId);
      };
    }

    if (el("btn-retire")) {
      el("btn-retire").onclick = function () {
        const st = ctx.getState();
        if (!(ctx.sys(st.system).retire && ctx.netWorth(st) >= ctx.RETIRE_NET)) return;
        ctx.log("Retired on Quiet Moon. Net ₩" + ctx.netWorth(st).toLocaleString() + ". Victory.");
        alert("You retire on Quiet Moon. Game clear — New starts a fresh captain.");
      };
    }

    if (el("btn-reset")) {
      el("btn-reset").onclick = function () {
        if (!confirm("Wipe save and start fresh?")) return;
        ctx.resetGame();
      };
    }

    document.querySelectorAll(".tabbar .tab").forEach(function (b) {
      b.onclick = function () {
        const holoOn = document.getElementById("holo-canvas") &&
          document.getElementById("holo-canvas").style.display === "block";
        if (holoOn && globalThis.SkiffHoloRenderer) {
          const exit = document.getElementById("btn-exit-holo");
          if (exit) exit.click();
          else globalThis.SkiffHoloRenderer.stop();
        }
        ctx.showTab(b.dataset.tab);
      };
    });

    document.querySelectorAll("[data-goto]").forEach(function (b) {
      b.onclick = function () {
        const holoOn = document.getElementById("holo-canvas") &&
          document.getElementById("holo-canvas").style.display === "block";
        if (holoOn && globalThis.SkiffHoloRenderer) {
          const exit = document.getElementById("btn-exit-holo");
          if (exit) exit.click();
          else globalThis.SkiffHoloRenderer.stop();
        }
        ctx.showTab(b.dataset.goto);
      };
    });

    if (el("mode-local")) el("mode-local").onclick = function () { ctx.setChartMode("local"); if (ctx.render) ctx.render(); };
    if (el("mode-sector")) el("mode-sector").onclick = function () { ctx.setChartMode("sector"); if (ctx.render) ctx.render(); };
    if (el("mode-full")) el("mode-full").onclick = function () { ctx.setChartMode("full"); if (ctx.render) ctx.render(); };

    const findForm = el("chart-find-form");
    if (findForm) {
      findForm.onsubmit = function (e) {
        e.preventDefault();
        ctx.runChartSearch((el("chart-search") || {}).value || "");
      };
    }

    if (el("map")) {
      const mapEl = el("map");
      let lastPointerDown = { x: -9999, y: -9999, time: 0 };
      function onMapClick(e) {
        const now = Date.now();
        if (e.type === "click" && now - lastPointerDown.time < 350 && Math.hypot(e.clientX - lastPointerDown.x, e.clientY - lastPointerDown.y) < 25) {
          return;
        }
        if (e.type === "pointerdown") {
          lastPointerDown = { x: e.clientX, y: e.clientY, time: now };
        }
        const s = ctx.pickSystemAt(e.clientX, e.clientY);
        if (!s) return;
        const st = ctx.getState();
        if (s.id === st.system) {
          ui.targetId = null;
          ui.courseDest = null;
        } else {
          if (ui.courseDest && ui.courseDest !== s.id) ui.courseDest = null;
          ui.targetId = s.id;
        }
        ctx.drawMap();
        ctx.renderTarget();
      }
      mapEl.addEventListener("pointerdown", onMapClick);
      mapEl.addEventListener("click", onMapClick);
    }

    window.addEventListener("resize", function () {
      if (ui.tab !== "chart") return;
      ctx.sizeMap();
      ctx.drawMap();
    });

    document.querySelectorAll("[data-theme-pick]").forEach(function (b) {
      b.onclick = function () { ctx.applyTheme(b.dataset.themePick, true); };
    });

    document.querySelectorAll("[data-text-size-pick]").forEach(function (b) {
      b.onclick = function () { if (ctx.applyTextSize) ctx.applyTextSize(b.dataset.textSizePick, true); };
    });

    document.querySelectorAll("[data-pilot-pick]").forEach(function (b) {
      b.onclick = function () { ctx.applyPilot(b.dataset.pilotPick, true); };
    });

    document.querySelectorAll("[data-renderer-pick]").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll("[data-renderer-pick]").forEach(function (btn) {
          btn.classList.toggle("active", btn === b);
        });
        if (b.dataset.rendererPick === "holo") {
          const hc = document.getElementById("holo-canvas");
          if (hc) {
            hc.style.display = "block";
            hc.style.pointerEvents = "auto";
          }
          const hs = document.getElementById("holo-search-wrap");
          if (hs) hs.style.display = "block";
          const he = document.getElementById("btn-exit-holo");
          if (he) he.style.display = "block";
          if (globalThis.SkiffHoloRenderer) {
            const st = ctx.getState();
            globalThis.SkiffHoloRenderer.start(st, ctx.HULL_SVG, ctx.systems(), {
              onTravel: travelRoute,
              onRefuel: ctx.doRefuel,
              onRepair: ctx.doRepair,
              onRearm: ctx.doRearm,
              onBuy: ctx.doBuy,
              onSell: ctx.doSell,
              onPin: function (id) {
                if (!id || id === st.system) return ctx.log("That's your current dock.");
                ui.targetId = id;
                ui.courseDest = id;
                const hint = ctx.WP.pinHint({ targetId: id, hereId: st.system });
                if (hint.ok && !ctx.WP.isPinned(st.waypoints, id)) {
                  const r = ctx.WP.toggle(st.waypoints, id);
                  st.waypoints = r.list;
                }
                const plan = ctx.coursePlan(id);
                const jumps = plan && plan.ok ? plan.jumps : "?";
                ctx.log("Course pinned: " + ((ctx.sys(id) || {}).name || id) + " — " + jumps + " hops. Engage hop; not a warp.");
                ctx.save(st);
                ctx.render();
              },
              onExit: function () {
                const classicBtn = document.querySelector('[data-renderer-pick="classic"]');
                if (classicBtn) classicBtn.click();
                else globalThis.SkiffHoloRenderer.stop();
              },
            });
          }
        } else {
          const hc = document.getElementById("holo-canvas");
          if (hc) {
            hc.style.display = "none";
            hc.style.pointerEvents = "none";
          }
          const hs = document.getElementById("holo-search-wrap");
          if (hs) hs.style.display = "none";
          const he = document.getElementById("btn-exit-holo");
          if (he) he.style.display = "none";
          if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.stop();
        }
      };
    });

    const holoFindForm = document.getElementById("holo-find-form");
    if (holoFindForm) {
      holoFindForm.onsubmit = function (e) {
        e.preventDefault();
        const q = (document.getElementById("holo-search") || {}).value || "";
        ctx.runChartSearch(q);
      };
    }

    const exitHolo = document.getElementById("btn-exit-holo");
    if (exitHolo) {
      exitHolo.onclick = function () {
        const classicBtn = document.querySelector('[data-renderer-pick="classic"]');
        if (classicBtn) classicBtn.click();
        else if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.stop();
      };
    }

    window.addEventListener("keydown", function (e) {
      if (e && (e.key === "Escape" || e.key === "Esc")) {
        const hc = document.getElementById("holo-canvas");
        const holoOn = hc && hc.style.display === "block";
        if (holoOn) {
          const exit = document.getElementById("btn-exit-holo");
          if (exit) exit.click();
          else if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.stop();
        }
      }
    });

    const takeStick = el("btn-take-stick");
    if (takeStick) takeStick.onclick = function () { ctx.applyPilot("human", true); };

    const prefBox = el("pref-autofuel");
    if (prefBox) {
      ctx.syncPrefsUi();
      prefBox.onchange = function () {
        const st = ctx.getState();
        st.prefs = st.prefs || { autoFuel: true };
        st.prefs.autoFuel = !!prefBox.checked;
        if (ctx.getBridgeOn()) {
          ctx.bridgeAct({ op: "set_prefs", autoFuel: st.prefs.autoFuel });
        } else {
          ctx.log(st.prefs.autoFuel ? "Auto-refuel on arrive: ON." : "Auto-refuel on arrive: OFF.");
          ctx.save(st);
          ctx.render();
        }
      };
    }

    const pinBtn = el("btn-waypoint");
    if (pinBtn) {
      pinBtn.onclick = function () {
        ctx.reclaimStick();
        const st = ctx.getState();
        const id = ui.targetId;
        const hint = ctx.WP.pinHint({ targetId: id, hereId: st.system });
        if (!hint.ok) {
          const box = el("waypoint-list");
          if (box) box.textContent = hint.log;
          return ctx.log(hint.log);
        }
        const r = ctx.WP.toggle(st.waypoints, id);
        st.waypoints = r.list;
        let msg;
        if (r.full) msg = "Waypoint list full (" + ctx.WP.MAX_WAYPOINTS + "). Unpin one first.";
        else if (r.added) msg = "Pinned " + ((ctx.sys(id) || {}).name || id) + " (#" + r.list.length + "). Numbered dot on the chart.";
        else if (r.removed) msg = "Unpinned " + ((ctx.sys(id) || {}).name || id) + ".";
        else msg = "Pin did nothing.";
        ctx.log(msg);
        ctx.save(st);
        ctx.render();
      };
    }

    const wpClear = el("btn-wp-clear");
    if (wpClear) {
      wpClear.onclick = function () {
        const st = ctx.getState();
        st.waypoints = ctx.WP.clear(st.waypoints);
        ctx.log("Waypoints cleared.");
        ctx.save(st);
        ctx.render();
      };
    }
  }

  return { setup: setup };
});
