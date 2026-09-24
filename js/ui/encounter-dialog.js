/**
 * Skiff Run — encounter modal open/resolve.
 * Agent stick and WebMCP local eval auto-resolve. Humans get the dialog.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffEncounterDialog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const dlg = ctx.el("encounter");
    let encKind = null;
    let encDest = null;
    let isLocalEval = false;

    function resolveEncounter(choice) {
      if (typeof document !== "undefined" && document.body) {
        document.body.classList.remove("enc-open");
      }
      if (dlg && dlg.open) dlg.close();
      const st = ctx.getState();
      const result = globalThis.SkiffCombat.resolveEncounter({
        state: st,
        encKind: encKind,
        dest: encDest,
        choice: choice,
        GOODS: globalThis.SkiffGoods,
        hull: ctx.hull(),
        cargoUsed: ctx.cargoUsed(st),
        tickSkill: ctx.tickSkill,
      });
      ctx.log(result.logMsg);
      encKind = null;
      encDest = null;
      ctx.render();
      if (ctx.getBridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function openEncounter(kind, dest) {
      const st = ctx.getState();
      encKind = kind;
      encDest = dest || ctx.sys(st.system);
      const armed = ctx.hull().weapons && st.crew > 0 && (st.ammo || 0) > 0;

      if (st.pilot === "agent" || isLocalEval) {
        let choice = "b";
        if (kind === "warden") {
          choice = st.credits >= 400 ? "a" : "b";
        } else if (kind === "trader") {
          choice = "a";
        } else {
          choice = armed ? "a" : (st.fuel >= 2 ? "b" : "a");
        }
        return resolveEncounter(choice);
      }

      const pir = ctx.activityLabel(encDest.pirate);
      const pol = ctx.activityLabel(encDest.police);
      if (kind === "warden") {
        ctx.el("enc-title").textContent = "Ledger Wardens";
        ctx.el("enc-body").textContent =
          "Patrol lock inbound (" + encDest.name + " · police " + pol + "). Inspection fine ₩400 — or bluff.";
        ctx.el("enc-a").textContent = "Pay fine";
        ctx.el("enc-b").textContent = "Bluff";
      } else if (kind === "trader") {
        ctx.el("enc-title").textContent = "Lane trader";
        ctx.el("enc-body").textContent =
          "A free hauler pings you near " + encDest.name + ". Hail for a quick deal, or wave them off.";
        ctx.el("enc-a").textContent = "Hail";
        ctx.el("enc-b").textContent = "Wave off";
      } else {
        ctx.el("enc-title").textContent = "Ash Corsairs";
        if (armed) {
          ctx.el("enc-body").textContent =
            "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Fight or burn fuel fleeing.";
          ctx.el("enc-a").textContent = "Fight";
          ctx.el("enc-b").textContent = "Flee (−fuel)";
        } else {
          ctx.el("enc-body").textContent =
            "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Dump cargo or flee.";
          ctx.el("enc-a").textContent = "Dump cargo";
          ctx.el("enc-b").textContent = "Flee (−fuel)";
        }
      }
      try {
        dlg.showModal();
      } catch {
        /* already open */
      }
      if (typeof document !== "undefined" && document.body) {
        document.body.classList.add("enc-open");
      }
    }

    function maybeEncounter(toId) {
      const st = ctx.getState();
      const dest = ctx.sys(toId) || ctx.sys(st.system);
      const SE = globalThis.SkiffEncounter;
      const kind = SE.pickEncounter(SE.encounterOdds(dest, ctx.hull()), Math.random);
      if (kind !== "none") openEncounter(kind, dest);
    }

    const btnA = ctx.el("enc-a");
    const btnB = ctx.el("enc-b");
    if (btnA) btnA.onclick = function () { resolveEncounter("a"); };
    if (btnB) btnB.onclick = function () { resolveEncounter("b"); };

    return {
      maybeEncounter: maybeEncounter,
      openEncounter: openEncounter,
      resolveEncounter: resolveEncounter,
      setLocalEval: function (on) { isLocalEval = !!on; },
      getEncKind: function () { return encKind; },
      getEncDest: function () { return encDest; },
      isDialogOpen: function () { return !!(dlg && dlg.open); },
    };
  }

  return { setup: setup };
});
