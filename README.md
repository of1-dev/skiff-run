# SKIFF RUN 0.9.41

Browser trade-run through the Ember chart. Original systems, goods, and ships.

**License:** [GPLv2](LICENSE) (or later).

**Credits:** mechanics inspired by Pieter Spronck’s Space Trader (GPLv2). See [CREDITS.md](CREDITS.md).

Sibling to [Hex Wake](https://github.com/of1-dev/hex-wake) — related night palette, different rules.

Open `index.html` locally or enable GitHub Pages on `main` / root.

**Agents:** builders start at [docs/code-map.md](docs/code-map.md). Player AIs (fly the career) start at [docs/fair-play.md](docs/fair-play.md) and must not read source for strategy.

## Quick Start & Player Guide

Open `index.html` in any browser (or tap into your deployed GitHub Pages URL). No installation, servers, or build tools required.

### The Core Loop
You are a freelance merchant captain in the Ember Reach galaxy. You begin with a standard **Skiff-7**, ₩3,200 in credits, and a full tank of fuel. Your goal: accumulate **₩35,000 net worth** (cash + cargo value + ship equity) and navigate to **Quiet Moon** to retire.

### Cockpit Navigation: The 5 Tabs
- **Dock**: Your home station. Read arrival news bulletins, accept **Dock Press** rumors and courier/bounty quests, earn backup cash via **Dock Work** (₩80), and press **Retire** once your ledger qualifies.
- **Market**: Exchange commercial goods. View local rates, price cues vs. galaxy averages (**Cheap — buy**, **Fair**, **Expensive — sell**), and one-tap utility actions:
  - **Fill cheap**: Instantly purchases the best-margin bargain into remaining hold space.
  - **Sell expensive**: Liquidates only goods trading at local premiums.
  - **Sell all**: Dumps entire cargo hold for immediate cash.
- **Chart**: Galaxy map and route navigation.
  - **Local view**: Highlights systems within immediate jump range; fuel reach circle shows reachable systems.
  - **Sector view**: Displays a ~48-unit regional cluster.
  - **Full view**: Complete 64-system galaxy map.
  - **Course plotting**: Tap any remote dock to view shortest BFS path; multi-hop routes enable **Hop via [System]**.
  - **Waypoints**: Tap **Pin** to bookmark destinations on your HUD.
  - **3D Holo View**: Toggle the Holo overlay for an interactive 2.5D wireframe star map with camera controls.
- **Yard**: Upgrade ships and crew up.
  - Trade in hulls for heavier haulers (**Hold Barge**, **Quiet Ark**) or agile fighters (**Ember Cutter**).
  - Trading down to lighter hulls refunds scrap value into your pockets.
  - Hire specialized crew members (Helm, Guns, Wrench) to boost navigation, combat odds, and fuel efficiency.
  - If broke, scrap for a free **Mite** to limp back into trade lanes.
- **Captain**: System preferences and flight control.
  - **Theme Select**: Toggle between **Cobalt** (charcoal & Bast ember), **Coffee**, and **LCARS**.
  - **Pilot Stick**: Switch control between **Human** (manual play) and **Agent** (WebMCP / autonomous AI pilot).
  - **Auto-refuel on arrive**: Automatically top off tanks at docks when affordable (default ON).
  - **God Mode**: Debug sandbox toggles for testing galaxy mechanics.

### Survival & Trading Strategy
1. **Never jump on an empty tank**: Fuel costs ₩45/unit. Running dry leaves you stranded or vulnerable to pirates.
2. **Read the threat colors**: Systems are color-coded by pirate risk (teal = peaceful, yellow = contested, red = high pirate activity).
3. **Encounters on the lane**:
   - **Ash Corsairs**: Armed + crewed ships can **Fight** for salvage payouts; unarmed ships must **Dump cargo** or burn fuel to **Flee**.
   - **Ledger Wardens**: Pay routine inspection tariffs or attempt a **Bluff**.
   - **Lane Traders**: Hail for quick in-flight trade deals.

For the complete retro-shareware handbook, see [GUIDE.md](GUIDE.md).

## Pages

Settings → Pages → Deploy from branch `main` / `/ (root)`.
Expected URL pattern: `https://<user>.github.io/skiff-run/`

<!-- pages-build: nudge -->

## Theme packs & Bast HUD (0.9.37)

Captain tab: **Cobalt** (default — Bast charcoal HUD with ember signal), **Coffee**, **LCARS**. Preference is saved separately from the run.

## Hull SVGs

Yard shows original class silhouettes (`assets/hulls/`). Common classes for all captains; faction exclusives optional later. See `docs/hull-roster.md`.

## Chart depth (0.5)

Systems have tech / gov / size / police / pirate activity. Chart node color = pirate risk; teal reward ring = expected trade edge from here. Target card shows dossier + margin stub.

## Pilot handoff, spectator & WebMCP (0.8.0 - 0.9.40)

Captain tab: **You** / **Agent**. Same single-player save; hand the stick back and forth. In-page WebMCP (`js/webmcp.js`) and stdio MCP seat in `mcp/` — see `docs/mcp-agent-seat.md`.

**Auto-refuel on arrive** (default ON) lives under Captain → Jump prefs.

**Fold spectator bridge:** `node mcp/bridge.mjs` then open `http://127.0.0.1:8787/?bridge=1` — shares `mcp/session/save.json` with stdio MCP. See `docs/spectator.md`.

Chart circle = **hull jump range**, not the fuel tank (fuel is the status strip).

## Modular architecture & Quest Lifecycle (0.9.40)

All JavaScript modules adhere to strict soft caps (orchestrator `game.js` <= 300 lines; `galaxy-state.js` <= 250 lines; all UI modules <= 300 lines). Domain logic is cleanly separated:
- Core: `js/core/galaxy-state.js` (~205L), `js/core/actions.js` (~283L), `js/core/market-actions.js` (~112L), `js/core/chart-gen.js`, `js/core/combat.js`
- Agent & Bridge: `js/agent-api.js`, `js/bridge-client.js`, `js/webmcp.js`
- UI: `js/ui/render-tabs.js` (~214L), `js/ui/render-yard.js` (~203L), `js/ui/render-target.js` (~108L), `js/ui/chart-view.js`, `js/ui/chart-interactions.js`, `js/ui/encounter-dialog.js`, `js/ui/god-panel.js`, `js/ui/theme-pilot.js`, `js/ui/dom-wire.js`, `js/ui/render-chart.js`

## Thin encounters (0.6)

Jumps can hit **Ash Corsairs**, **Ledger Wardens**, or a **lane trader**. Odds follow destination pirate/police activity (chart colors matter). Small unarmed hulls draw less heat.

## Full galaxy (0.9)

Chart modes: **Local** (hull jump range) · **Sector** (regional window) · **Full** (entire playable map).
Named roster expanded to a ST-scale Ember galaxy (64 systems); New still reshuffles x/y of the same names.


## Tests (ATDD)

```bash
npm test
# On Fedora Atomic / Silverblue host:
toolbox run -c skiff npm test
```

See `docs/testing-atdd.md`.
