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
      hint.innerHTML = "";
      state.quests.forEach(function (q) {
        const destObj = sys(q.dest);
        const destName = destObj ? destObj.name : q.dest;
        const jumpsLeft = q.jumpsLeft != null ? q.jumpsLeft : 10;
        const isUrgent = jumpsLeft <= 3;

        const card = document.createElement("div");
        card.className = "card-block";
        card.style.cssText = "margin-bottom:8px;padding:8px;border:1px solid " + (isUrgent ? "var(--threat,#C45C4A)" : "var(--line,#44403C)") + ";background:var(--raised,#292524);border-radius:var(--radius);";

        const header = document.createElement("div");
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
        const title = document.createElement("strong");
        title.textContent = q.title;
        title.style.color = "var(--type,#E7E0D6)";
        const reward = document.createElement("span");
        reward.textContent = "₩" + (q.reward || 0).toLocaleString();
        reward.style.cssText = "color:var(--signal,#D97757);font-weight:bold;";
        header.appendChild(title);
        header.appendChild(reward);
        card.appendChild(header);

        const sub = document.createElement("div");
        sub.className = "hint";
        sub.style.cssText = "margin:4px 0 8px;font-size:12px;" + (isUrgent ? "color:var(--danger,#C45C4A);" : "");
        const urgText = isUrgent
          ? "CRITICAL: " + jumpsLeft + " jump" + (jumpsLeft === 1 ? "" : "s") + " before breach fine (−₩1,000)!"
          : jumpsLeft + " jump" + (jumpsLeft === 1 ? "" : "s") + " remaining";
        const spdText = jumpsLeft >= 7 ? " · Speed bonus active (+35% ₩" + Math.floor((q.reward || 0) * 0.35) + ")" : "";
        sub.textContent = "Target: " + destName + " · " + urgText + spdText;
        card.appendChild(sub);

        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:6px;";

        const plotBtn = document.createElement("button");
        plotBtn.type = "button";
        plotBtn.className = "btn ghost";
        plotBtn.style.cssText = "padding:4px 10px;font-size:12px;";
        plotBtn.textContent = "Plot Course: " + destName;
        plotBtn.onclick = function (e) {
          e.preventDefault();
          const view = typeof ctx.getUi === "function" ? ctx.getUi() : ctx.ui;
          if (view) { view.courseDest = q.dest; view.targetId = q.dest; }
          if (typeof ctx.showTab === "function") ctx.showTab("chart");
          if (typeof ctx.log === "function") ctx.log("Course plotted to " + destName + " for " + q.title);
          if (typeof ctx.render === "function") ctx.render();
        };
        actions.appendChild(plotBtn);

        const abandonBtn = document.createElement("button");
        abandonBtn.type = "button";
        abandonBtn.className = "btn outline";
        abandonBtn.style.cssText = "padding:4px 10px;font-size:12px;color:var(--threat,#C45C4A);border-color:var(--threat,#C45C4A);";
        abandonBtn.textContent = "Abandon (−₩500)";
        abandonBtn.onclick = function (e) {
          e.preventDefault();
          if (typeof ctx.doAbandonQuest === "function") {
            ctx.doAbandonQuest(q.id);
          }
        };
        actions.appendChild(abandonBtn);

        card.appendChild(actions);
        hint.appendChild(card);
      });
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
        const label = card.label || card.name || card.role || "Crew";
        row.textContent = label + " \u2014 " + (card.quirk || "steady") +
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
