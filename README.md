# SKIFF RUN 0.6.0

Browser trade-run through the Ember chart. Original systems, goods, and ships.

Sibling to [Hex Wake](https://github.com/of1-dev/hex-wake) — related night palette, different rules.

Open `index.html` locally or enable GitHub Pages on `main` / root.

## How to play

Fold-friendly **tabs**: Dock · Market · Chart (Local / Sector) · Yard · Captain. Warp from the chart.


1. Buy low / sell high across systems. Use **+/−** qty, then Buy/Sell.
2. Check the **chart** and **Travel** peeks — neighbor prices + fuel cost by distance. **New** reshuffles the same named systems into a new layout.
3. Refuel at each stop. Jump range depends on your hull.
4. Yards at Ember Reach / Ash Meridian / Knot Harbor: trade up to Hold Barge or armed Ember Cutter. Hire crew for bunks.
5. Encounters: **Ledger Wardens** or **Ash Corsairs** (armed+crewed can fight).
6. Reach **₩35,000** net and retire on **Quiet Moon**.

Save is automatic (`localStorage`).

## Pages

Settings → Pages → Deploy from branch `main` / `/ (root)`.
Expected URL pattern: `https://<user>.github.io/skiff-run/`

<!-- pages-build: nudge -->

## Theme packs

Captain tab: **Cobalt** (default), **Coffee**, **LCARS**. Preference is saved separately from the run.

## Hull SVGs

Yard shows original class silhouettes (`assets/hulls/`). Common classes for all captains; faction exclusives optional later. See `docs/hull-roster.md`.

## Chart depth (0.5)

Systems have tech / gov / size / police / pirate activity. Chart node color = pirate risk; teal reward ring = expected trade edge from here. Target card shows dossier + margin stub.

## Pilot handoff (0.6.0)

Captain tab: **You** / **Agent**. Same single-player save; hand the stick back and forth. MCP agent seat TBD — see `docs/mcp-agent-seat.md`.

## Thin encounters (0.6)

Jumps can hit **Ash Corsairs**, **Ledger Wardens**, or a **lane trader**. Odds follow destination pirate/police activity (chart colors matter). Small unarmed hulls draw less heat.
