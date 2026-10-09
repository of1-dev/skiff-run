/**
 * Skiff Run — AI Debug Mode and window.__skiff API (ATDD).
 * Provides deterministic PRNG, encounter forcing, teleportation, state setting,
 * and collapsible debug panel for automated tests and AI QA.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    if (root) root.SkiffAiDebug = module.exports;
  } else root.SkiffAiDebug = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  let currentSeed = null;
  let currentRng = null;
  let forcedOutcome = "random";

  function isAiDebugOn(search) {
    const q = String(search || "");
    return /(?:\?|&)(?:aidebug)=(?:1|true)(?:&|$)/i.test(q);
  }

  function getUrlSeed(search) {
    const m = String(search || "").match(/(?:\?|&)seed=(-?\d+)(?:&|$)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function setSeed(n) {
    if (n === null || n === undefined || isNaN(Number(n))) {
      currentSeed = null;
      currentRng = null;
      return { ok: true, seed: null };
    }
    const val = Number(n);
    currentSeed = val;
    currentRng = mulberry32(val >>> 0);
    return { ok: true, seed: currentSeed };
  }

  function getRng() {
    return currentRng || Math.random;
  }

  function setForcedOutcome(outcome) {
    forcedOutcome = String(outcome || "random").toLowerCase();
  }

  function consumeForcedOutcome() {
    const out = forcedOutcome;
    if (forcedOutcome !== "random") {
      forcedOutcome = "random";
      if (typeof document !== "undefined") {
        const sel = document.getElementById("debug-force-outcome");
        if (sel) sel.value = "random";
      }
    }
    return out;
  }

  function init(ctx) {
    function getState() {
      const st = ctx.getState();
      const h = ctx.hull ? ctx.hull() : {};
      const sysId = st.system;
      const s = ctx.sys ? (ctx.sys(sysId) || {}) : {};
      return {
        credits: st.credits,
        fuel: st.fuel,
        hull: st.hull !== undefined ? st.hull : (h.hullMax || 0),
        ammo: st.ammo !== undefined ? st.ammo : (h.ammoMax || 0),
        location: s.name || sysId,
        system: sysId,
        systemName: s.name || sysId,
        ship: h,
        shipId: st.shipId,
        crew: st.crew,
        roster: Array.isArray(st.roster) ? st.roster.slice() : [],
        cargo: Object.assign({}, st.cargo),
        quests: Array.isArray(st.quests) ? st.quests.slice() : [],
        seed: currentSeed,
      };
    }

    function teleport(systemName) {
      if (!systemName) return { ok: false, error: "Missing system name" };
      const systems = (ctx.getSystems && ctx.getSystems()) || [];
      const q = String(systemName).trim().toLowerCase();
      const target = systems.find(s => s.id.toLowerCase() === q)
        || systems.find(s => s.name.toLowerCase() === q)
        || systems.find(s => s.name.toLowerCase().includes(q))
        || systems.find(s => s.id.toLowerCase().includes(q));

      if (!target) return { ok: false, error: "System not found: " + systemName };

      const st = ctx.getState();
      st.system = target.id;
      if (ctx.markVisited) ctx.markVisited(target.id);
      st.dockWorkAt = null;
      st.pressBoughtAt = null;
      if (ctx.ui) {
        ctx.ui.targetId = null;
        ctx.ui.courseDest = null;
      }
      if (ctx.rollMarket) ctx.rollMarket(st);
      if (ctx.log) ctx.log("Teleported to " + target.name + ".");
      if (ctx.save) ctx.save(st);
      if (ctx.render) ctx.render();
      if (ctx.bridgeOn && ctx.bridgeOn() && ctx.bridgeAct) {
        ctx.bridgeAct({ op: "save", state: st });
      }
      syncInputs();
      return { ok: true, system: target.id, name: target.name };
    }

    function setState(partial) {
      if (!partial || typeof partial !== "object") return getState();
      const st = ctx.getState();
      if (partial.credits !== undefined) st.credits = Number(partial.credits);
      if (partial.fuel !== undefined) st.fuel = Number(partial.fuel);
      if (partial.hull !== undefined) st.hull = Number(partial.hull);
      if (partial.ammo !== undefined) st.ammo = Number(partial.ammo);
      if (partial.location !== undefined) {
        teleport(partial.location);
      } else if (partial.system !== undefined) {
        teleport(partial.system);
      }
      if (partial.ship !== undefined) {
        if (typeof partial.ship === "string") st.shipId = partial.ship;
        else if (partial.ship && partial.ship.id) st.shipId = partial.ship.id;
      } else if (partial.shipId !== undefined) {
        st.shipId = partial.shipId;
      }
      if (partial.crew !== undefined) {
        if (typeof partial.crew === "number") st.crew = partial.crew;
        else if (Array.isArray(partial.crew)) {
          st.roster = partial.crew.slice();
          st.crew = st.roster.length;
        }
      }
      if (partial.cargo !== undefined && typeof partial.cargo === "object") {
        st.cargo = Object.assign({}, st.cargo, partial.cargo);
      }
      if (partial.quests !== undefined && Array.isArray(partial.quests)) {
        st.quests = partial.quests.slice();
      }
      if (partial.seed !== undefined) {
        setSeed(partial.seed);
      }
      if (ctx.save) ctx.save(st);
      if (ctx.render) ctx.render();
      if (ctx.bridgeOn && ctx.bridgeOn() && ctx.bridgeAct) {
        ctx.bridgeAct({ op: "save", state: st });
      }
      syncInputs();
      return getState();
    }

    function forceEncounter(type) {
      const kind = String(type || "").toLowerCase();
      if (kind !== "corsair" && kind !== "warden" && kind !== "trader") {
        return { ok: false, error: "Invalid encounter type: " + type };
      }
      const st = ctx.getState();
      if (kind === "corsair") {
        const h = ctx.hull ? ctx.hull() : {};
        if (!h.weapons) st.shipId = "ember-cutter";
        if ((st.crew || 0) <= 0) st.crew = 1;
        if ((st.ammo || 0) <= 0) st.ammo = 10;
      }
      if (ctx.openEncounter) {
        const dest = ctx.sys ? ctx.sys(st.system) : { id: st.system, name: st.system };
        ctx.openEncounter(kind, dest);
      }
      return { ok: true, encounter: kind };
    }

    function syncInputs() {
      if (typeof document === "undefined") return;
      const st = ctx.getState();
      const h = ctx.hull ? ctx.hull() : {};
      const elCredits = document.getElementById("debug-state-credits");
      const elFuel = document.getElementById("debug-state-fuel");
      const elHull = document.getElementById("debug-state-hull");
      const elAmmo = document.getElementById("debug-state-ammo");
      const elSeed = document.getElementById("debug-seed-input");

      if (elCredits) elCredits.value = st.credits;
      if (elFuel) elFuel.value = st.fuel;
      if (elHull) elHull.value = st.hull !== undefined ? st.hull : (h.hullMax || 0);
      if (elAmmo) elAmmo.value = st.ammo !== undefined ? st.ammo : (h.ammoMax || 0);
      if (elSeed && currentSeed !== null) elSeed.value = currentSeed;
    }

    // Auto-read seed from URL if present
    if (typeof window !== "undefined" && window.location) {
      const urlSeed = getUrlSeed(window.location.search);
      if (urlSeed !== null) {
        setSeed(urlSeed);
      }
    }

    // Wire debug UI if document is present
    if (typeof document !== "undefined") {
      const panel = document.getElementById("ai-debug-panel");
      const isDebug = typeof window !== "undefined" && window.location && isAiDebugOn(window.location.search);
      if (panel) {
        if (isDebug) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      }

      const btnCorsair = document.getElementById("debug-force-corsair");
      if (btnCorsair) btnCorsair.onclick = function () { forceEncounter("corsair"); };

      const btnWarden = document.getElementById("debug-force-warden");
      if (btnWarden) btnWarden.onclick = function () { forceEncounter("warden"); };

      const btnTrader = document.getElementById("debug-force-trader");
      if (btnTrader) btnTrader.onclick = function () { forceEncounter("trader"); };

      const btnTeleport = document.getElementById("debug-teleport-btn");
      const inTeleport = document.getElementById("debug-teleport-input");
      if (btnTeleport && inTeleport) {
        btnTeleport.onclick = function () {
          if (inTeleport.value.trim()) teleport(inTeleport.value.trim());
        };
        inTeleport.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            if (inTeleport.value.trim()) teleport(inTeleport.value.trim());
          }
        });
      }

      const btnApplyState = document.getElementById("debug-apply-state");
      if (btnApplyState) {
        btnApplyState.onclick = function () {
          const elCredits = document.getElementById("debug-state-credits");
          const elFuel = document.getElementById("debug-state-fuel");
          const elHull = document.getElementById("debug-state-hull");
          const elAmmo = document.getElementById("debug-state-ammo");
          const partial = {};
          if (elCredits && elCredits.value !== "") partial.credits = Number(elCredits.value);
          if (elFuel && elFuel.value !== "") partial.fuel = Number(elFuel.value);
          if (elHull && elHull.value !== "") partial.hull = Number(elHull.value);
          if (elAmmo && elAmmo.value !== "") partial.ammo = Number(elAmmo.value);
          setState(partial);
          if (ctx.log) ctx.log("Debug: state values updated.");
        };
      }

      const btnApplySeed = document.getElementById("debug-apply-seed");
      const inSeed = document.getElementById("debug-seed-input");
      if (btnApplySeed && inSeed) {
        btnApplySeed.onclick = function () {
          const s = inSeed.value.trim();
          if (s === "") setSeed(null);
          else setSeed(Number(s));
          if (ctx.log) ctx.log("Debug: seed set to " + currentSeed);
        };
      }

      const selOutcome = document.getElementById("debug-force-outcome");
      if (selOutcome) {
        selOutcome.onchange = function () {
          setForcedOutcome(selOutcome.value);
          if (ctx.log) ctx.log("Debug: next encounter outcome forced to " + selOutcome.value);
        };
      }

      const btnCopyState = document.getElementById("debug-copy-state");
      if (btnCopyState) {
        btnCopyState.onclick = function () {
          const data = JSON.stringify(getState(), null, 2);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(data).then(function () {
              const orig = btnCopyState.textContent;
              btnCopyState.textContent = "Copied!";
              setTimeout(function () { btnCopyState.textContent = orig; }, 1500);
            }).catch(function () {
              fallbackCopy(data, btnCopyState);
            });
          } else {
            fallbackCopy(data, btnCopyState);
          }
          if (ctx.log) ctx.log("Game state copied to clipboard.");
        };
      }

      function fallbackCopy(text, btn) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          const orig = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(function () { btn.textContent = orig; }, 1500);
        } catch {}
        document.body.removeChild(ta);
      }

      syncInputs();
    }

    const skiff = {
      getState: getState,
      setState: setState,
      forceEncounter: forceEncounter,
      teleport: teleport,
      setSeed: setSeed,
      version: ctx.VERSION || "0.9.41",
    };

    if (typeof window !== "undefined") {
      window.__skiff = skiff;
    }
    globalThis.__skiff = skiff;

    return {
      getState,
      setState,
      forceEncounter,
      teleport,
      setSeed,
      syncInputs,
      getRng,
      setForcedOutcome,
      consumeForcedOutcome,
    };
  }

  return {
    isAiDebugOn,
    getUrlSeed,
    mulberry32,
    setSeed,
    getRng,
    setForcedOutcome,
    consumeForcedOutcome,
    init,
  };
});
