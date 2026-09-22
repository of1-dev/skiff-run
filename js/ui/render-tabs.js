(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffTabsRenderer = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function setup(app) {
    // Expose EVERYTHING that might be used by these UI components
    const {
      el, sys, state, ui, themeColors, fuelReachDistance, SYSTEMS, 
      canJumpTo, isVisited, riskFill, canSeeTrade, bestLaneEdge, 
      peekPrices, WP, CF, fuelCost, dist, inRange, SECTOR_RADIUS,
      hull, GOODS, SHIPS, netWorth, cargoUsed, qtyFor, doSellAll, doFillCheap, doSellExpensive, doRefuel, doRepair, doRearm,
      doYardTake, godEnabled, currentTheme, applyTheme, applyPilot, currentPilot, tickSkill, CR, SK, formatTickerLine,
      sellQty, buyQty, doMarketBuy, doMarketSell,
      VERSION
    } = app;

function renderShipPanel() {
    const h = hull();
    el("ship-name").textContent = h.name + (h.weapons ? " · armed" : " · unarmed");
    el("ship-meta").textContent =
      "hold " + h.cargo + " · tanks " + h.fuelMax + " · range " + h.range +
      " · crew " + state.crew + "/" + h.crewMax;
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
      yard.innerHTML = "<p class=\"hint\">Dry dock — no usable hull stock (dead-tech or too hot). Market and dock work still run. Chart toward a Mite scrap or a real yard.</p>";
    } else if (stock === "mite") {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Scrap pad — Mite escape hull only. Full yards carry the rest of the commons.";
      yard.appendChild(note);
    } else {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Full yard — commons on the list. Unbowed stays gated (not for sale).";
      yard.appendChild(note);
    }
    offered.forEach((s) => {
      if (s.id === state.shipId) return;
      const row = document.createElement("div");
      row.className = "yard-row";
      const ownedTrade = Math.floor((hull().price || 0) * 0.55);
      const delta = YE.tradeDelta(hull().price || 0, s.price);
      const due = YE.tradeDue(delta);
      const surplus = YE.tradeSurplus(delta);
      const info = document.createElement("div");
      info.className = "yard-info";
      info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
      const text = document.createElement("div");
      const listPrice = s.price === 0
        ? "List free (escape / starter)"
        : ("List ₩" + s.price.toLocaleString());
      let tradeHint;
      if (s.price === 0 && surplus > 0) tradeHint = "Take + scrap payout ₩" + surplus.toLocaleString();
      else if (s.price === 0) tradeHint = "Take this hull";
      else if (surplus > 0) tradeHint = "Trade down — pocket ₩" + surplus.toLocaleString();
      else if (ownedTrade > 0) tradeHint = "You pay ₩" + due.toLocaleString() + " after ₩" + ownedTrade.toLocaleString() + " trade-in";
      else tradeHint = "You pay ₩" + due.toLocaleString() + " (no trade-in on current hull)";
      const cargoBlock = cargoUsed(state) > s.cargo;
      const escapeDump = s.id === "mite" && cargoBlock;
      text.innerHTML =
        "<strong>" + s.name + "</strong><div class=\"have\">" +
        "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
        (s.weapons ? " · weapons" : " · no guns") +
        " · crew max " + s.crewMax +
        "</div><div class=\"have\">" + listPrice + "</div>" +
        "<div class=\"hint\">" + tradeHint +
        (escapeDump ? " · taking Mite jettisons overflow cargo" : "") +
        "</div>";
      info.appendChild(text);
      row.appendChild(info);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = s.price === 0 ? "Take" : "Buy";
      btn.disabled = state.credits < due || (cargoBlock && !escapeDump);
      btn.onclick = () => doBuyShip(s.id);
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
        ? "Already worked this stay — jump to reset."
        : ("Shift pays ₩" + DOCK_WORK_PAY + ". Once per dock stay.")) +
      "</div></div>";
    workRow.appendChild(workInfo);
    const workBtn = document.createElement("button");
    workBtn.type = "button";
    workBtn.className = "chip ghost";
    workBtn.textContent = worked ? "Done" : ("Work (+₩" + DOCK_WORK_PAY + ")");
    workBtn.disabled = worked;
    workBtn.onclick = doDockWork;
    workRow.appendChild(workBtn);
    yard.appendChild(workRow);

    const crewBox = el("crew-actions");
    crewBox.innerHTML = "";
    const hire = document.createElement("button");
    hire.type = "button";
    hire.className = "chip";
    hire.textContent = "Hire (₩" + CREW_HIRE + "+)";
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
      row.textContent = card.label + " — " + card.quirk +
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


function renderAgentActionLog() {
    const box = el("agent-action-log");
    if (!box) return;
    const rows = Array.isArray(state.agentLog) ? state.agentLog : [];
    if (!rows.length) {
      box.textContent = "No agent acts yet.";
      return;
    }
    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // Newest last — show chronological; scroll to bottom.
    box.innerHTML = rows.map(function (e) {
      const op = esc(e && e.op);
      const summary = esc(e && e.summary);
      return '<div class="agent-act"><span class="op">' + op + '</span>' + summary + '</div>';
    }).join("");
    box.scrollTop = box.scrollHeight;
    const ttxt = el("top-agent-ticker-text");
    if (ttxt && window.SkiffAgentActionLog && typeof window.SkiffAgentActionLog.formatTickerLine === "function") {
      ttxt.textContent = window.SkiffAgentActionLog.formatTickerLine(state.agentLog);
    }
  }


function renderQuests() {
    const hint = el("quest-tracker-hint");
    if (!hint) return;
    if (!state.quests || state.quests.length === 0) {
      hint.textContent = "No active quests. Check the local Dock Press for news, rumors, and bounties.";
      return;
    }
    hint.innerHTML = "<strong>Active Quests:</strong><br/>" + state.quests.map(q => {
      const destObj = sys(q.dest);
      const destName = destObj ? destObj.name : q.dest;
      return `► ${q.title} (Reward: ₩${q.reward})`;
    }).join("<br/>");
  }


function renderSkillsBox() {
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
      num.textContent = String(val) + (boost > 0 ? (" +·crew") : "");
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


    return { renderShipPanel, renderAgentActionLog, renderQuests, renderSkillsBox };
  }

  return { setup };
}));
