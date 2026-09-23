/**
 * Skiff Run — Theme and Pilot mode UI controllers.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffThemePilot = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const THEMES = ["cobalt", "coffee", "lcars"];
    const THEME_KEY = "skiff-run-theme";

    function cssVar(name, fallback) {
      if (typeof document === "undefined" || !document.documentElement) return fallback;
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function themeColors() {
      return {
        bg: cssVar("--map-bg", cssVar("--bg-deep", "#0C0A09")),
        here: cssVar("--map-here", cssVar("--signal", "#D97757")),
        sel: cssVar("--selected-hop", cssVar("--map-sel", "#D97757")),
        reach: cssVar("--map-reach", "#C4B9AC"),
        far: cssVar("--map-far", "#57534E"),
        label: cssVar("--map-label", cssVar("--text", "#E7E0D6")),
        mute: cssVar("--map-mute", cssVar("--mute", "#A39A90")),
        grid: cssVar("--map-grid", "rgba(68,64,60,0.55)"),
        ring: cssVar("--map-ring", "rgba(217,119,87,0.55)"),
        link: cssVar("--map-link", "rgba(122,158,126,0.55)"),
        linkDim: cssVar("--map-link-dim", "rgba(68,64,60,0.4)"),
        ok: cssVar("--ok", "#7A9E7E"),
        warn: cssVar("--warn", "#C4A35A"),
        danger: cssVar("--danger", "#C45C4A"),
        threat: cssVar("--threat", "#C45C4A"),
        cta: cssVar("--cta", "#D97757"),
      };
    }

    function applyTheme(name, persist) {
      if (typeof document === "undefined" || !document.documentElement) return;
      const t = THEMES.includes(name) ? name : "cobalt";
      document.documentElement.setAttribute("data-theme", t);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", cssVar("--bg", cssVar("--wall", "#1C1917")));
      document.querySelectorAll("[data-theme-pick]").forEach(function (b) {
        b.classList.toggle("active", b.dataset.themePick === t);
      });
      const hint = ctx.el("theme-hint");
      if (hint) {
        hint.textContent = t === "cobalt"
          ? "Cobalt — Bast charcoal HUD, ember signal."
          : t === "coffee"
            ? "Coffee — warm stone panels, same ember hero."
            : "LCARS — orange console homage (fan aesthetic pack).";
      }
      if (persist !== false) {
        try { localStorage.setItem(THEME_KEY, t); } catch (e) { console.warn("[skiff] theme save failed:", e.message); }
      }
      const ui = ctx.getUi();
      if (ui && ui.tab === "chart") {
        ctx.sizeMap();
        ctx.drawMap();
      }
    }

    function loadTheme() {
      let t = "cobalt";
      try { t = localStorage.getItem(THEME_KEY) || "cobalt"; } catch (e) { console.warn("[skiff] theme read failed:", e.message); }
      applyTheme(t, false);
    }

    function currentPilot() {
      return ctx.getState().pilot === "agent" ? "agent" : "human";
    }

    function reclaimStick() {
      if (currentPilot() !== "agent") return;
      applyPilot("human", true);
      if (ctx.getBridgeOn() && typeof ctx.bridgeAct === "function") {
        ctx.bridgeAct({ op: "take_stick" });
      }
    }

    function applyPilot(who, announce) {
      const p = who === "agent" ? "agent" : "human";
      const st = ctx.getState();
      st.pilot = p;
      const shell = ctx.el("app");
      if (shell) shell.classList.toggle("is-agent-pilot", p === "agent");
      const banner = ctx.el("pilot-banner");
      if (banner) banner.hidden = p !== "agent";
      const ticker = ctx.el("top-agent-ticker");
      if (ticker) ticker.hidden = p !== "agent";
      const btxt = ctx.el("pilot-banner-text");
      if (btxt) btxt.textContent = "Agent has the stick — watching until you take over.";
      if (typeof document !== "undefined") {
        document.querySelectorAll("[data-pilot-pick]").forEach(function (b) {
          b.classList.toggle("active", b.dataset.pilotPick === p);
        });
      }
      const hint = ctx.el("pilot-hint");
      if (hint) {
        hint.textContent = p === "agent"
          ? "Agent seat armed. MCP can fly this save when connected; Take stick anytime."
          : "You have the stick. Hand to Agent when you want the LLM to fly.";
      }
      if (announce) {
        ctx.log(p === "agent" ? "Agent has the stick." : "Captain took the stick.");
      }
      ctx.save(st);
    }

    return {
      cssVar: cssVar,
      themeColors: themeColors,
      applyTheme: applyTheme,
      loadTheme: loadTheme,
      currentPilot: currentPilot,
      reclaimStick: reclaimStick,
      applyPilot: applyPilot,
    };
  }

  return { setup: setup };
});
