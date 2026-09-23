# SKIFF RUN 0.9.37

Browser trade-run through the Ember chart. Original systems, goods, and ships.

**License:** [GPLv2](LICENSE) (or later).

**Credits:** mechanics inspired by Pieter Spronck’s Space Trader (GPLv2). See [CREDITS.md](CREDITS.md).

Sibling to [Hex Wake](https://github.com/of1-dev/hex-wake) — related night palette, different rules.

Open `index.html` locally or enable GitHub Pages on `main` / root.

**Agents:** builders start at [docs/code-map.md](docs/code-map.md). Player AIs (fly the career) start at [docs/fair-play.md](docs/fair-play.md) and must not read source for strategy.

## How to play

**Captain’s Notes:** see [GUIDE.md](GUIDE.md) — fold-sized how-to in ’98 shareware voice.

Fold-friendly **tabs**: Dock · Market · Chart (Local / Sector / Full) · Yard · Captain. Warp from the chart.


1. Buy low / sell high across systems. Use **+/−** qty, then Buy/Sell.
2. Check the **chart** (Local = jump range, Sector = regional, Full = whole galaxy) and peeks — neighbor prices + fuel cost by distance. **New** reshuffles the same named systems into a new layout.
3. Refuel at each stop. Jump range depends on your hull.
4. Yards at Ember Reach / Ash Meridian / Knot Harbor and other yard docks: trade up to Hold Barge or armed Ember Cutter. Hire crew for bunks.
5. Encounters: **Ledger Wardens** or **Ash Corsairs** (armed+crewed can fight).
6. Reach **₩35,000** net and retire on **Quiet Moon**.

Save is automatic (`localStorage`).

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

## Pilot handoff, spectator & WebMCP (0.8.0 - 0.9.37)

Captain tab: **You** / **Agent**. Same single-player save; hand the stick back and forth. In-page WebMCP (`js/webmcp.js`) and stdio MCP seat in `mcp/` — see `docs/mcp-agent-seat.md`.

**Auto-refuel on arrive** (default ON) lives under Captain → Jump prefs.

**Fold spectator bridge:** `node mcp/bridge.mjs` then open `http://127.0.0.1:8787/?bridge=1` — shares `mcp/session/save.json` with stdio MCP. See `docs/spectator.md`.

Chart circle = **hull jump range**, not the fuel tank (fuel is the status strip).

## Modular architecture (0.9.37)

`game.js` is kept strictly under a **<= 300 line soft cap** as a pure orchestrator. Domain logic lives in clean standalone modules:
- Core: `js/core/galaxy-state.js`, `js/core/actions.js`, `js/core/market-actions.js`, `js/core/chart-gen.js`, `js/core/combat.js`
- Agent & Bridge: `js/agent-api.js`, `js/bridge-client.js`, `js/webmcp.js`
- UI: `js/ui/chart-view.js`, `js/ui/chart-interactions.js`, `js/ui/encounter-dialog.js`, `js/ui/god-panel.js`, `js/ui/theme-pilot.js`, `js/ui/dom-wire.js`, `js/ui/render-chart.js`, `js/ui/render-tabs.js`

## Thin encounters (0.6)

Jumps can hit **Ash Corsairs**, **Ledger Wardens**, or a **lane trader**. Odds follow destination pirate/police activity (chart colors matter). Small unarmed hulls draw less heat.

## Full galaxy (0.9)

Chart modes: **Local** (hull jump range) · **Sector** (regional window) · **Full** (entire playable map).
Named roster expanded to a ST-scale Ember galaxy (64 systems); New still reshuffles x/y of the same names.


## Tests (ATDD)

```bash
npm test
```

See `docs/testing-atdd.md`.
