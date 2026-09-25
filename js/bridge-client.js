/**
 * Skiff Run — Bridge Client.
 * Handles HTTP synchronization with the local bridge server (/api/state, /api/act)
 * and coordinates shared-seat pilot takeover.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffBridgeClient = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      getState,
      setState,
      applyChart,
      rollMarket,
      applyPilot,
      syncPrefsUi,
      showTab,
      render,
      renderAgentActionLog,
      log,
      sys,
      openEncounter,
      currentPilot,
      getEncKind,
      getDlg,
      setUiTargetNull,
    } = ctx;

    let lastAgentT = 0;

    function applyBridgePayload(data) {
      if (!data || !data.state) return;
      let state = data.state;
      state.prefs = state.prefs || { autoFuel: true };
      if (state.prefs.autoFuel == null) state.prefs.autoFuel = true;

      // Ensure chart fallback if bridge session lacks pos
      if (state.chart && state.chart.pos) {
        applyChart(state.chart);
      }

      if (!state.prices || !Object.keys(state.prices).length) {
        rollMarket(state);
      }

      const prevState = typeof getState === "function" ? getState() : null;
      const systemChanged = prevState && prevState.system !== state.system;
      setState(state);
      applyPilot(state.pilot || "human", false);
      syncPrefsUi();
      if (systemChanged && typeof setUiTargetNull === "function") setUiTargetNull();
      render();
      if (typeof renderAgentActionLog === "function") renderAgentActionLog();

      if (state.pilot === "agent" && state.agentLog && state.agentLog.length > 0) {
        const last = state.agentLog[state.agentLog.length - 1];
        if (last.t && last.t > lastAgentT) {
          lastAgentT = last.t;
          const op = last.op;
          if (op === "jump") showTab("chart");
          else if (op === "buy_press" || op === "dock_work" || op === "buy_ship") showTab("dock");
          else if (op === "sell_all" || op === "sell_expensive" || op === "fill_cheap") showTab("market");
          else if (op === "retire") showTab("captain");
        }
      }

      // Surface pending encounter from shared seat (once)
      const ek = typeof getEncKind === "function" ? getEncKind() : null;
      const dlg = typeof getDlg === "function" ? getDlg() : null;
      if (data.pendingEncounter && currentPilot() === "human" && !ek) {
        const pe = data.pendingEncounter;
        const dest = sys(pe.systemId) || sys(state.system);
        if (pe.kind && dest) openEncounter(pe.kind, dest);
      } else if (!data.pendingEncounter && ek && dlg && dlg.open) {
        /* keep local dialog until resolved via act */
      }
    }

    function apiPath(endpoint) {
      if (typeof location !== "undefined" && location.pathname) {
        if (location.pathname.startsWith("/skiffrun")) return "/skiffrun" + endpoint;
        if (location.pathname.startsWith("/skiff")) return "/skiff" + endpoint;
      }
      return endpoint;
    }

    async function bridgeAct(body) {
      try {
        const r = await fetch(apiPath("/api/act"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}),
        });
        const data = await r.json();
        applyBridgePayload(data);
        if (data.result && data.result.ok === false && data.result.error) {
          log(String(data.result.error) + (data.result.hint ? (" — " + data.result.hint) : ""));
        }
        return data;
      } catch (e) {
        log("Bridge act failed: " + e);
        return null;
      }
    }

    async function bridgePoll() {
      try {
        const r = await fetch(apiPath("/api/state"), { cache: "no-store" });
        const data = await r.json();
        applyBridgePayload(data);
      } catch (e) {
        console.warn("[bridgePoll] offline or frame skip:", e.message);
      }
    }

    function initBridge() {
      document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
        b.onclick = () => {
          const who = b.dataset.pilotPick;
          if (who === "human") bridgeAct({ op: "take_stick" });
          else bridgeAct({ op: "claim" });
        };
      });
      const takeStickBtn = document.getElementById("btn-take-stick");
      if (takeStickBtn) takeStickBtn.onclick = () => bridgeAct({ op: "take_stick" });
      const resetBtn = document.getElementById("btn-reset");
      if (resetBtn) {
        resetBtn.onclick = () => {
          if (!confirm("Wipe save and start fresh on the shared seat?")) return;
          bridgeAct({ op: "new_game" });
        };
      }
      document.body.classList.add("bridge-mode");
      bridgePoll();
      setInterval(bridgePoll, 500);
    }

    return {
      applyBridgePayload,
      bridgeAct,
      bridgePoll,
      initBridge,
    };
  }

  return { setup };
});
