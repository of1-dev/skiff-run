/**
 * Skiff Run — Yard, Crew, Skills & Quest renderers. (<= 200 lines)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffRenderYard = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      el, sys, hull, cargoUsed,
      CR, SK, YE,
      makeHullArt, hullStock, yardOffered,
      doBuyShip, DOCK_WORK_PAY, doDockWork, CREW_HIRE, doHireCrew, doFireCrew,
    } = ctx;
    function st() { return typeof ctx.getState === "function" ? ctx.getState() : ctx.state; }

    function renderQuests() {
      const state = st();
      const hint = el("quest-tracker-hint");
      if (!hint) return;
      if (!state.quests || state.quests.length === 0) {
        hint.textContent = "No active quests. Check the local Dock Press for news, rumors, and bounties.";
        return;
      }
      hint.innerHTML = "<strong>Active Quests:</strong><br/>" + state.quests.map(function (q) {
        const destObj = sys(q.dest);
        const destName = destObj ? destObj.name : q.dest;
        return "\u25ba " + q.title + " \u2192 " + destName + " (Reward: \u20a9" + q.reward + ")";
      }).join("<br/>");
    }

    function renderSkillsBox() {
      const state = st();
      const box = el("skills-box");
      if (!box) return;
      const eff = CR.shipSkills(state.skills, state.roster || [], hull());
      box.className = "skills-box";
      box.innerHTML = "";
      (SK.SKILL_IDS || ["pilot", "fighter", "trader", "engineer"]).forEach(function (id) {
        const row = document.createElement("div");
        row.className = "skill-bar";
        const cap = (state.skills && state.skills[id]) | 0;
        const val = eff.skills[id] | 0;
        const boost = val - cap;
        const fill = document.createElement("span");
        fill.className = "skill-fill";
        fill.style.width = (val * 10) + "%";
        const track = document.createElement("span");
        track.className = "skill-track";
        track.appendChild(fill);
        const name = document.createElement("span");
        name.className = "skill-id";
        name.textContent = id;
        const num = document.createElement("span");
        num.className = "skill-n";
        num.textContent = String(val) + (boost > 0 ? " +\u00b7crew" : "");
        row.appendChild(name);
        row.appendChild(track);
        row.appendChild(num);
        box.appendChild(row);
      });
      if (eff.notes && eff.notes.length) {
        const n = document.createElement("p");
        n.className = "hint";
        n.textContent = "Fit: " + eff.notes.join(", ") + ".";
        box.appendChild(n);
      }
    }

    function renderShipPanel() {
      const state = st();
      const h = hull();
      el("ship-name").textContent = h.name + (h.weapons ? " \u00b7 armed" : " \u00b7 unarmed");
      el("ship-meta").textContent =
        "hold " + h.cargo + " \u00b7 tanks " + h.fuelMax + " \u00b7 range " + h.range +
        " \u00b7 crew " + state.crew + "/" + h.crewMax;
      const ownedArt = el("ship-art");
      if (ownedArt) {
        ownedArt.innerHTML = "";
        ownedArt.appendChild(makeHullArt(h.id, "hull-art hull-art--owned"));
      }
      const yard = el("yard");
      yard.innerHTML = "";
      const stock = hullStock(sys(state.system));
      const offered = yardOffered();
      if (stock === "none") {
        yard.innerHTML = "<p class=\"hint\">Dry dock \u2014 no usable hull stock (dead-tech or too hot). Market and dock work still run. Chart toward a Mite scrap or a real yard.</p>";
      } else if (stock === "mite") {
        const note = document.createElement("p");
        note.className = "hint";
        note.textContent = "Scrap pad \u2014 Mite escape hull only. Full yards carry the rest of the commons.";
        yard.appendChild(note);
      } else {
        const note = document.createElement("p");
        note.className = "hint";
        note.textContent = "Full yard \u2014 commons on the list. Unbowed stays gated (not for sale).";
        yard.appendChild(note);
      }
      offered.forEach(function (s) {
        if (s.id === state.shipId) return;
        const row = document.createElement("div");
        row.className = "yard-row";
        const delta = YE.tradeDelta(hull().price || 0, s.price);
        const due = YE.tradeDue(delta);
        const surplus = YE.tradeSurplus(delta);
        const ownedTrade = Math.floor((hull().price || 0) * 0.55);
        const info = document.createElement("div");
        info.className = "yard-info";
        info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
        const text = document.createElement("div");
        const listPrice = s.price === 0
          ? "List free (escape / starter)"
          : ("List \u20a9" + s.price.toLocaleString());
        let tradeHint;
        if (s.price === 0 && surplus > 0) tradeHint = "Take + scrap payout \u20a9" + surplus.toLocaleString();
        else if (s.price === 0) tradeHint = "Take this hull";
        else if (surplus > 0) tradeHint = "Trade down \u2014 pocket \u20a9" + surplus.toLocaleString();
        else if (ownedTrade > 0) tradeHint = "You pay \u20a9" + due.toLocaleString() + " after \u20a9" + ownedTrade.toLocaleString() + " trade-in";
        else tradeHint = "You pay \u20a9" + due.toLocaleString() + " (no trade-in on current hull)";
        const cargoBlock = cargoUsed(state) > s.cargo;
        const escapeDump = s.id === "mite" && cargoBlock;
        text.innerHTML =
          "<strong>" + s.name + "</strong><div class=\"have\">" +
          "hold " + s.cargo + " \u00b7 fuel " + s.fuelMax + " \u00b7 range " + s.range +
          (s.weapons ? " \u00b7 weapons" : " \u00b7 no guns") +
          " \u00b7 crew max " + s.crewMax +
          "</div><div class=\"have\">" + listPrice + "</div>" +
          "<div class=\"hint\">" + tradeHint +
          (escapeDump ? " \u00b7 taking Mite jettisons overflow cargo" : "") +
          "</div>";
        info.appendChild(text);
        row.appendChild(info);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = s.price === 0 ? "Take" : "Buy";
        btn.disabled = state.credits < due || (cargoBlock && !escapeDump);
        btn.onclick = function () { doBuyShip(s.id); };
        row.appendChild(btn);
        yard.appendChild(row);
      });

      const workRow = document.createElement("div");
      workRow.className = "yard-row";
      const workInfo = document.createElement("div");
      workInfo.className = "yard-info";
      const worked = state.dockWorkAt === state.system;
      workInfo.innerHTML = "<div><strong>Dock work</strong><div class=\"hint\">" +
        (worked
          ? "Already worked this stay \u2014 jump to reset."
          : ("Shift pays \u20a9" + DOCK_WORK_PAY + ". Once per dock stay.")) +
        "</div></div>";
      workRow.appendChild(workInfo);
      const workBtn = document.createElement("button");
      workBtn.type = "button";
      workBtn.className = "chip ghost";
      workBtn.textContent = worked ? "Done" : ("Work (+\u20a9" + DOCK_WORK_PAY + ")");
      workBtn.disabled = worked;
      workBtn.onclick = doDockWork;
      workRow.appendChild(workBtn);
      yard.appendChild(workRow);

      const crewBox = el("crew-actions");
      crewBox.innerHTML = "";
      const hire = document.createElement("button");
      hire.type = "button";
      hire.className = "chip";
      hire.textContent = "Hire (\u20a9" + CREW_HIRE + "+)";
      hire.disabled = state.crew >= h.crewMax || state.credits < CREW_HIRE;
      hire.onclick = doHireCrew;
      const fire = document.createElement("button");
      fire.type = "button";
      fire.className = "chip ghost";
      fire.textContent = "Dismiss";
      fire.disabled = state.crew < 1;
      fire.onclick = doFireCrew;
      crewBox.appendChild(hire);
      crewBox.appendChild(fire);
      const list = document.createElement("div");
      list.className = "crew-roster";
      (state.roster || []).forEach(function (card) {
        const row = document.createElement("div");
        row.className = "crew-card";
        row.textContent = card.label + " \u2014 " + card.quirk +
          " (P" + card.pilot + " F" + card.fighter + " T" + card.trader + " E" + card.engineer + ")";
        list.appendChild(row);
      });
      if (!(state.roster || []).length) {
        const row = document.createElement("div");
        row.className = "crew-card hint";
        row.textContent = "No hands aboard.";
        list.appendChild(row);
      }
      crewBox.appendChild(list);
    }

    return { renderShipPanel, renderSkillsBox, renderQuests };
  }

  return { setup };
});
