---
title: Skiff Run — ST mechanics SoT + Skiff skin + stack
created: 2026-09-12
updated: 2026-09-12
type: policy
status: locked
dest: shared
source: Andrew Lazo / Grandmaster chat
source_kind: user-decision
blockers: []
---

# Skiff Run direction (locked 2026-09-12)

## Split

| Layer | Source of truth |
|-------|-----------------|
| **Mechanics intent** | Public classic **Palm Space Trader** by **Pieter Spronck** (GPLv2 C). Analyze for politics, prices, encounters, ship/gadget math, travel/fuel/range, retirement. |
| **Rules text** | **Markdown** under `docs/` — tables, formulas, contracts agents can diff. MD is the written SoT for what Skiff *should* do. |
| **Runtime** | **JavaScript** — Fold (Pages) + shared engine + MCP seat. One hot-path language. |
| **Skin / product** | **Skiff Run** name, Ember fiction, hull art, Fold UI, themes, of1-dev repo |

## Method (clean-room)

1. **Analyze** Spronck’s C (read / note behavior).
2. **Write** rules into MD (`docs/…`) with modern structure — not a paste of his source.
3. **Implement** those MD contracts in JS (`game.js` / shared engine / `mcp/engine.mjs`).
4. **Credit** Spronck / Space Trader publicly (`CREDITS.md`, Captain). Title stays **Skiff Run**.

Do **not** line-for-line translate his `.c` into the repo. That would be a GPL derivative. Clean-room alignment stays **MIT**.

## Stack choices (locked)

| Use | Language |
|-----|----------|
| Play UI + Pages + MCP game logic | **JavaScript** (keep) |
| One-off analysis (dump ST tables → MD) | **Python** OK |
| Rust / Go | **No** for this game unless Andrew reopens — overkill for the sim |

## Credit

- Pieter Spronck / Space Trader — https://www.spronck.net/spacetrader/
- Historical source: https://github.com/historicalsource/spacetrader
- Homage may be said aloud; not Paramount packaging; not “we own Space Trader”

## License watch

- Repo: **MIT** while clean-room.
- Substantial paste/port of ST C → must **GPL** that derivative. Prefer not to; prefer MD + JS clean-room.

## Keep

- Fold shell, themes, hull SVGs, MCP / spectator
- Original system/hull/good names (not ST’s TNG-flavored list)

## Related

- Repo: `CREDITS.md`, `docs/st-mechanics-sot.md`
- Metal-first ship: `cloud_agents_vs_nuc.md`

## Extract folder

First MD dump of ST tables/formulas:

- **[`docs/st-extract/`](st-extract/README.md)** — index + politics, tradeitems, ships, gadgets-weapons-shields, police-record, encounters, pricing, autofuel-travel
- License: [`st-extract/LICENSE-NOTE.md`](st-extract/LICENSE-NOTE.md), [`st-extract/RELICENSE.md`](st-extract/RELICENSE.md)

Depth plan still: [`docs/depth-from-st.md`](depth-from-st.md).

