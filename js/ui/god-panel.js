/**
 * Skiff Run — Captain god toggle and grant buttons.
 * Bridge seat POSTs god ops; local seat mutates state and save().
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffGodPanel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    function state() { return ctx.getState(); }
    function bridgeOn() { return !!ctx.getBridgeOn(); }

    function syncGodUi() {
      const on = ctx.godEnabled();
      const godPanel = ctx.el("god-panel");
      if (godPanel) {
        if (on) godPanel.removeAttribute("hidden");
        else godPanel.setAttribute("hidden", "");
      }
      const btn = ctx.el("pref-godmode");
      if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "God tools: on" : "God tools: off";
        btn.classList.toggle("ember", on);
        btn.classList.toggle("ghost", !on);
      }
    }

    let godClickLock = false;
    function setGodMode(on) {
      on = !!on;
      const st = state();
      st.prefs = st.prefs || { autoFuel: true };
      st.prefs.godMode = on;
      ctx.writeGodFlag(on);
      ctx.log(on ? "God mode ON — Unbowed kit unlocked." : "God mode OFF.");
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
      else ctx.save(st);
      syncGodUi();
    }

    const godPref = ctx.el("pref-godmode");
    if (godPref) {
      godPref.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (godClickLock) return;
        godClickLock = true;
        setGodMode(!ctx.godEnabled());
        setTimeout(function () { godClickLock = false; }, 250);
      });
    }

    const wireGod = function (id, fn) {
      const b = ctx.el(id);
      if (b) b.onclick = function () {
        if (!ctx.godEnabled()) return ctx.log("Enable God mode on Captain first.");
        fn();
      };
    };

    wireGod("god-credits", function () {
      if (bridgeOn()) {
        ctx.bridgeAct({ op: "god_credits", amount: ctx.GOD.GRANT_DEFAULT });
        return;
      }
      ctx.setState(ctx.GOD.grantCredits(state(), ctx.GOD.GRANT_DEFAULT));
      ctx.log("God: +₩" + ctx.GOD.GRANT_DEFAULT.toLocaleString() + ".");
      ctx.save(state());
      ctx.render();
    });
    wireGod("god-fuel", function () {
      if (bridgeOn()) {
        ctx.bridgeAct({ op: "god_fuel" });
        return;
      }
      ctx.setState(ctx.GOD.fillFuel(state(), ctx.hull().fuelMax));
      ctx.log("God: tanks topped.");
      ctx.save(state());
      ctx.render();
    });
    wireGod("god-yard", function () {
      if (bridgeOn()) {
        ctx.bridgeAct({ op: "god_yard" });
        return;
      }
      ctx.setState(ctx.GOD.unlockYard(state()));
      ctx.log("God: full yard unlocked at every dock.");
      ctx.save(state());
      ctx.render();
    });
    wireGod("god-unbowed", function () {
      if (bridgeOn()) {
        ctx.bridgeAct({ op: "grant_unbowed" });
        return;
      }
      const r = ctx.GOD.grantUnbowed(state(), ctx.SHIPS, ctx.GOODS.map(function (x) { return x.id; }));
      if (!r.ok) return ctx.log("God: cannot grant Unbowed (" + r.reason + ").");
      ctx.setState(r.state);
      const st = state();
      if (ctx.CR && ctx.CR.normalizeRoster) {
        st.roster = ctx.CR.normalizeRoster(st.roster, ctx.hull().crewMax);
        st.crew = ctx.CR.syncHeadcount(st.roster);
      }
      ctx.log("Unbowed granted — peak crew aboard. Career unlock still locked." + (r.jettison ? (" Jettisoned " + r.jettison + " cargo.") : ""));
      ctx.save(st);
      ctx.render();
    });
    wireGod("god-wasp", function () {
      if (bridgeOn()) {
        ctx.bridgeAct({ op: "grant_wasp" });
        return;
      }
      const r = ctx.GOD.grantWasp(state(), ctx.SHIPS, ctx.GOODS.map(function (x) { return x.id; }));
      if (!r.ok) return ctx.log("God: cannot set Wasp Prime (" + r.reason + ").");
      ctx.setState(r.state);
      const st = state();
      if (ctx.CR && ctx.CR.normalizeRoster) {
        st.roster = ctx.CR.normalizeRoster(st.roster, ctx.hull().crewMax);
        st.crew = ctx.CR.syncHeadcount(st.roster);
      }
      ctx.log("God: Wasp Prime + hands aboard" + (r.jettison ? (" — jettisoned " + r.jettison + " cargo.") : "."));
      ctx.save(st);
      ctx.render();
    });

    return { syncGodUi: syncGodUi, setGodMode: setGodMode };
  }

  return { setup: setup };
});
