/**
 * Skiff Run — gameplay mutations (travel, yard, press).
 * Factory: SkiffActions.setup(ctx). game.js keeps the save and the DOM.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffActions = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    function state() { return ctx.getState(); }
    function ui() { return ctx.getUi(); }
    function bridgeOn() { return !!ctx.getBridgeOn(); }
    function agentBlocked() {
      return bridgeOn() && ctx.currentPilot() === "agent";
    }

    function applyRefuelInternal(prefix) {
      const st = state();
      const r = ctx.SF.applyRefuel({ fuel: st.fuel, fuelMax: ctx.hull().fuelMax, credits: st.credits });
      if (!r.ok) {
        if (!prefix && r.reason === "credits") ctx.log("Can't afford fuel.");
        return false;
      }
      st.fuel = r.fuel; st.credits = r.credits;
      const cost = r.bought * ctx.FUEL_PRICE;
      const msg = r.partial ? ((prefix || "Partial refuel") + " +" + r.bought + " for ₩" + cost + ".")
        : prefix ? (prefix + " full for ₩" + cost + ".") : ("Refueled for ₩" + cost + ".");
      ctx.log(msg);
      return true;
    }

    function maybeAutoRefuel() {
      const st = state();
      st.prefs = st.prefs || { autoFuel: true };
      if (!st.prefs.autoFuel) return;
      applyRefuelInternal("Auto-refuel");
    }

    function doTravel(toId) {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state();
      const view = ui();
      let dest = toId;
      const goal = ctx.courseDest();
      if (!ctx.inRange(st.system, dest)) {
        const plan = ctx.coursePlan(dest);
        if (!plan || !plan.ok || !plan.next) return ctx.log("Out of jump range.");
        dest = plan.next;
        view.courseDest = goal || toId;
      }
      if (!ctx.inRange(st.system, dest)) return ctx.log("Out of jump range.");
      const cost = ctx.fuelCost(st.system, dest);
      if (st.fuel < cost) return ctx.log("Need " + cost + " fuel.");
      st.fuel -= cost;
      st.system = dest;
      ctx.markVisited(dest);
      st.dockWorkAt = null;
      st.pressBoughtAt = null;

      st.quests = st.quests || [];
      const qk = ctx.QK || globalThis.SkiffQuests;
      if (qk) {
        const qRes = qk.resolveJumpQuests(st.quests, st.system);
        st.quests = qRes.active;
        qRes.completed.forEach(function (c) {
          const msg = (c.isFast ? "Fast delivery! " : "Completed ") + c.quest.title + (c.isFast ? " (+₩" + c.bonus + " bonus)!" : "") + " Total ₩" + c.payout + "!";
          ctx.log(msg);
          if (globalThis.SkiffCaptainLog) st.captainLog = globalThis.SkiffCaptainLog.append(st.captainLog, { type: "quest", summary: msg });
        });
        if (qRes.totalPayout > 0) st.credits = (st.credits || 0) + qRes.totalPayout;
        qRes.expired.forEach(function (exp) {
          const msg = "EXPIRED: " + exp.quest.title + " lapsed! Fined ₩" + exp.penalty + ".";
          ctx.log(msg);
          if (globalThis.SkiffCaptainLog) st.captainLog = globalThis.SkiffCaptainLog.append(st.captainLog, { type: "quest", summary: msg });
        });
        if (qRes.totalPenalty > 0) st.credits = Math.max(0, (st.credits || 0) - qRes.totalPenalty);
      } else {
        const comp = st.quests.filter(function (q) { return q.dest === st.system; });
        st.quests = st.quests.filter(function (q) { return q.dest !== st.system; });
        if (comp.length > 0) {
          const sum = comp.reduce(function (s, q) { return s + q.reward; }, 0);
          st.credits = (st.credits || 0) + sum;
          ctx.log("Completed " + comp.length + " quest(s) for ₩" + sum + "!");
        }
      }

      ctx.rollMarket(st);
      const still = (goal && goal !== dest) ? goal : ctx.courseDest();
      if (still && still !== dest) {
        view.courseDest = still;
        const plan = ctx.coursePlan(still);
        view.targetId = (plan && plan.next) ? plan.next : still;
        const left = plan && plan.jumps ? plan.jumps : "?";
        ctx.log("Arrived " + ctx.sys(dest).name + " (−" + cost + " fuel). Course still " + (ctx.sys(still) || {}).name + " — " + left + " jumps.");
      } else {
        view.courseDest = null;
        view.targetId = null;
        ctx.log("Arrived " + ctx.sys(dest).name + " (−" + cost + " fuel).");
      }
      maybeAutoRefuel();
      ctx.render();
      ctx.tickSkill("pilot", true);
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
      ctx.maybeEncounter(dest);
    }

    function doRefuel() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state();
      const need = ctx.hull().fuelMax - st.fuel;
      if (need <= 0) return ctx.log("Tanks full.");
      if (!applyRefuelInternal(null)) return;
      ctx.tickSkill("engineer", true);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doRepair() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state(), h = ctx.hull();
      if (!h.hullMax) return ctx.log("Hull has no integrity rating.");
      const need = h.hullMax - (st.hull || 0);
      if (need <= 0) return ctx.log("Hull is at 100%.");
      const canAfford = Math.floor(st.credits / 20);
      if (canAfford <= 0) return ctx.log("Not enough credits for repairs.");
      const repair = Math.min(need, canAfford);
      st.credits -= repair * 20; st.hull = (st.hull || 0) + repair;
      ctx.log("Repaired " + repair + " hull points (-" + (repair * 20) + " ₩).");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doRearm() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state(), h = ctx.hull();
      if (!h.ammoMax) return ctx.log("Ship has no weapon mounts.");
      const need = h.ammoMax - (st.ammo || 0);
      if (need <= 0) return ctx.log("Ammo bays full.");
      const canAfford = Math.floor(st.credits / 50);
      if (canAfford <= 0) return ctx.log("Not enough credits for ammo.");
      const loaded = Math.min(need, canAfford);
      st.credits -= loaded * 50; st.ammo = (st.ammo || 0) + loaded;
      ctx.log("Loaded " + loaded + " ordnance (-" + (loaded * 50) + " ₩).");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doBuyShip(id) {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state();
      const next = ctx.ship(id);
      if (!next) return;
      const stock = ctx.hullStock(ctx.sys(st.system));
      if (!ctx.yardOffered().some(function (s) { return s.id === id; })) {
        return ctx.log(stock === "none" ? "Dry dock — no hull stock here." : "That hull isn't on this pad.");
      }
      if (ctx.cargoUsed(st) > next.cargo) {
        if (next.id === "mite") {
          const n = ctx.dumpToFit(next.cargo);
          if (ctx.cargoUsed(st) > next.cargo) return ctx.log("Can't lighten enough for a Mite.");
          ctx.log("Jettisoned " + n + " cargo to squeeze into a Mite.");
        } else {
          return ctx.log("Dump cargo before taking a smaller hold.");
        }
      }
      const delta = ctx.YE.tradeDelta(ctx.hull().price || 0, next.price);
      const due = ctx.YE.tradeDue(delta);
      const surplus = ctx.YE.tradeSurplus(delta);
      if (st.credits < due) return ctx.log("Need ₩" + due.toLocaleString() + " after trade-in.");
      st.credits -= due;
      st.credits += surplus;
      st.shipId = next.id;
      st.roster = ctx.CR.normalizeRoster(st.roster || [], next.crewMax);
      st.crew = ctx.CR.syncHeadcount(st.roster);
      if (st.fuel > next.fuelMax) st.fuel = next.fuelMax;
      let pay = "Paid ₩" + due.toLocaleString();
      if (surplus > 0) pay = "Scrap payout ₩" + surplus.toLocaleString();
      else if (due === 0) pay = "No cash due";
      ctx.log("Signed for " + next.name + (next.weapons ? " (armed)" : "") + ". " + pay + ".");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doDockWork() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state();
      const shift = ctx.YE.afterDockWork(st.dockWorkAt, st.system, st.credits);
      if (!shift.ok) return ctx.log("Already worked this stay.");
      st.dockWorkAt = shift.dockWorkAt;
      st.credits = shift.credits;
      ctx.log("Dock shift done. +₩" + shift.pay + " — limp stake toward a Mite or yard.");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doHireCrew() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state(), h = ctx.hull(), offer = ctx.CR.makeOffer();
      const gate = ctx.CR.canHire(st.roster || [], h.crewMax, st.credits, offer);
      if (!gate.ok) return ctx.log(gate.reason === "no_bunks" ? "No bunks left." : "Can't afford crew.");
      st.credits -= gate.cost;
      st.roster = ctx.CR.afterHire(st.roster || [], offer, h.crewMax);
      st.crew = ctx.CR.syncHeadcount(st.roster);
      ctx.log("Hired " + offer.label + " (— " + offer.quirk + ") for ₩" + gate.cost + ". Crew " + st.crew + "/" + h.crewMax + ".");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doFireCrew() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state(), fired = ctx.CR.afterDismiss(st.roster || [], null);
      if (!fired.ok) return ctx.log("No crew to dismiss.");
      st.roster = fired.roster; st.crew = ctx.CR.syncHeadcount(st.roster); st.credits += fired.refund;
      ctx.log("Dismissed a hand. +₩" + fired.refund + ".");
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
    }

    function doBuyPress() {
      if (agentBlocked()) return ctx.log("Agent has the stick.");
      const st = state();
      const buy = ctx.SP.buyPress({ credits: st.credits, pressBoughtAt: st.pressBoughtAt, systemId: st.system });
      if (!buy.ok) return ctx.log(buy.reason === "already" ? "Already bought today's Press at this dock." : "Need ₩" + ctx.SP.PRESS_PRICE + " for the Dock Press.");
      st.credits = buy.credits; st.pressBoughtAt = buy.pressBoughtAt;
      const edition = ctx.SP.rollEdition({ hereId: st.system, systems: ctx.systems(), goods: ctx.GOODS, priceFor: ctx.priceFor });
      st.pressEdition = edition;
      st.lastPress = edition;

      st.quests = st.quests || [];
      const qk = ctx.QK || globalThis.SkiffQuests;
      if (Math.random() < 0.6 && qk) {
        const newQ = qk.createQuest(ctx.systems(), st.system);
        if (newQ) {
          st.quests.push(newQ);
          const qText = "*** NEW QUEST: " + newQ.title + " (Reward: ₩" + newQ.reward + ") ***";
          edition.lines.push(qText);
          if (Array.isArray(edition.tips)) edition.tips.push({ text: qText, action: { type: "chart", systemId: newQ.dest } });
          if (typeof window !== "undefined" && typeof window.confirm === "function" && ctx.currentPilot() === "human") {
            const dName = (ctx.sys(newQ.dest) || {}).name || newQ.dest;
            if (window.confirm("New contract:\n" + newQ.title + "\nDestination: " + dName + " (Reward: ₩" + newQ.reward + ")\n\nProceed and plot course now?")) {
              const v = ui();
              if (v) { v.courseDest = newQ.dest; v.targetId = newQ.dest; }
              if (typeof ctx.showTab === "function") ctx.showTab("chart");
              ctx.log("Course plotted to " + dName + " for " + newQ.title);
            }
          }
        }
      }

      ctx.log("Dock Press ₩" + buy.paid + " — " + edition.masthead);
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "save", state: st });
      else ctx.save(st);
    }

    function doAbandonQuest(questId) {
      if (agentBlocked()) return ctx.log("Agent flying. Stick locked.");
      const st = state();
      const qk = ctx.QK || globalThis.SkiffQuests;
      if (!qk) return;
      const res = qk.abandonQuest(st.quests, questId);
      if (!res.ok) return ctx.log("Quest not found.");
      st.quests = res.remaining;
      st.credits = Math.max(0, (st.credits || 0) - res.penalty);
      const msg = "Contract abandoned: " + res.quest.title + " (−₩" + res.penalty + " fee).";
      ctx.log(msg);
      if (globalThis.SkiffCaptainLog) st.captainLog = globalThis.SkiffCaptainLog.append(st.captainLog, { type: "quest", summary: msg });
      ctx.render();
      if (bridgeOn()) ctx.bridgeAct({ op: "abandon_quest", id: questId });
      else ctx.save(st);
    }

    return {
      doTravel: doTravel,
      doRefuel: doRefuel,
      doRepair: doRepair,
      doRearm: doRearm,
      doBuyShip: doBuyShip,
      doDockWork: doDockWork,
      doHireCrew: doHireCrew,
      doFireCrew: doFireCrew,
      doBuyPress: doBuyPress,
      doAbandonQuest: doAbandonQuest,
    };
  }

  return { setup: setup };
});
