/**
 * Skiff Run — encounter modal open/resolve.
 * Agent stick and WebMCP local eval auto-resolve. Humans get the dialog.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../core/armament.js"));
  else root.SkiffEncounterDialog = factory(root.SkiffArmament);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Armament) {
  "use strict";

  function setup(ctx) {
    const dlg = ctx.el("encounter");
    let encKind = null;
    let encDest = null;
    let isLocalEval = false;

    function formatOutcome(outcome) {
      if (!outcome) return "Resolved";
      switch (outcome) {
        case "victory": return "Victory";
        case "defeat": return "Defeat";
        case "fled": return "Fled";
        case "cargo_lost": return "Cargo Lost";
        case "escaped": return "Escaped";
        case "shakedown": return "Shakedown";
        case "fine_paid": return "Fine Paid";
        case "bluffed": return "Bluff Succeeded";
        case "bluff_failed": return "Bluff Failed";
        case "sold_cargo": return "Cargo Sold";
        case "bought_cargo": return "Cargo Purchased";
        case "waved_off": return "Waved Off";
        case "no_trade": return "No Trade";
        default: return outcome.charAt(0).toUpperCase() + outcome.slice(1);
      }
    }

    function formatDetails(summary) {
      if (!summary) return "";
      const parts = [];
      if (summary.creditsChange) {
        parts.push((summary.creditsChange > 0 ? "+₩" : "-₩") + Math.abs(summary.creditsChange));
      }
      if (summary.fuelChange) {
        parts.push((summary.fuelChange > 0 ? "+" : "") + summary.fuelChange + " fuel");
      }
      if (summary.hullChange < 0) {
        parts.push("-" + Math.abs(summary.hullChange) + " hull");
      } else if (summary.hullChange > 0) {
        parts.push("+" + summary.hullChange + " hull");
      }
      if (summary.ammoChange) {
        parts.push(summary.ammoChange + " ammo");
      }
      if (summary.cargoChange) {
        parts.push((summary.cargoChange > 0 ? "+" : "") + summary.cargoChange + " cargo");
      }
      if (summary.crewChange) {
        parts.push((summary.crewChange > 0 ? "+" : "") + summary.crewChange + " crew");
      }
      return parts.length ? parts.join(" · ") : "No status changes";
    }

    function dismissResult() {
      const resultView = ctx.el("enc-result");
      if (resultView) resultView.hidden = true;
      const choiceView = ctx.el("enc-choice-view");
      if (choiceView) choiceView.hidden = false;
      if (dlg && dlg.open) dlg.close();
      if (typeof document !== "undefined" && document.body) {
        document.body.classList.remove("enc-open");
      }
      encKind = null;
      encDest = null;
    }

    function resolveEncounter(choice) {
      const st = ctx.getState();
      const isAgent = st.pilot === "agent" || isLocalEval;
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
      ctx.render();
      if (ctx.getBridgeOn()) ctx.bridgeAct({ op: "save", state: st });

      const resultView = ctx.el("enc-result");
      if (isAgent || !resultView) {
        if (typeof document !== "undefined" && document.body) {
          document.body.classList.remove("enc-open");
        }
        if (dlg && dlg.open) dlg.close();
        encKind = null;
        encDest = null;
        return;
      }

      const choiceView = ctx.el("enc-choice-view");
      if (choiceView) choiceView.hidden = true;
      resultView.hidden = false;

      const summary = (result && result.summary) || {};
      const outcomeEl = ctx.el("enc-result-outcome");
      if (outcomeEl) outcomeEl.textContent = formatOutcome(summary.outcome);
      const detailsEl = ctx.el("enc-result-details");
      if (detailsEl) detailsEl.textContent = formatDetails(summary);

      const btnDismiss = ctx.el("enc-dismiss") || ctx.el("enc-continue");
      if (btnDismiss) btnDismiss.onclick = dismissResult;
    }

    function openEncounter(kind, dest) {
      const st = ctx.getState();
      encKind = kind;
      encDest = dest || ctx.sys(st.system);
      const armed = Armament.isArmed(st, ctx.hull());

      const choiceView = ctx.el("enc-choice-view");
      const resultView = ctx.el("enc-result");
      if (choiceView) choiceView.hidden = false;
      if (resultView) resultView.hidden = true;

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
      } else if (kind === "pirate_lord") {
        ctx.el("enc-title").textContent = "Pirate Lord";
        if (armed) {
          ctx.el("enc-body").textContent =
            "The Pirate Lord's flagship intercepts you at " + encDest.name + "! Fight to claim the bounty or flee.";
          ctx.el("enc-a").textContent = "Fight";
          ctx.el("enc-b").textContent = "Flee (−fuel)";
        } else {
          const why = Armament.reason(st, ctx.hull());
          ctx.el("enc-body").textContent =
            "The Pirate Lord's flagship intercepts you at " + encDest.name + "! " +
            (why === "no_ammo" ? "Your ammo bays are empty!" : "You have no weapons mounted!") +
            " Dump cargo or flee.";
          ctx.el("enc-a").textContent = "Dump cargo";
          ctx.el("enc-b").textContent = "Flee (−fuel)";
        }
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
    const btnDismiss = ctx.el("enc-dismiss") || ctx.el("enc-continue");
    if (btnA) btnA.onclick = function () { resolveEncounter("a"); };
    if (btnB) btnB.onclick = function () { resolveEncounter("b"); };
    if (btnDismiss) btnDismiss.onclick = dismissResult;

    const initialResultView = ctx.el("enc-result");
    if (initialResultView) initialResultView.hidden = true;

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
