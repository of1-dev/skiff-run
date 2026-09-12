---
title: Space Trader mechanics extract (clean-room MD)
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
dest: of1
source: historicalsource/spacetrader (Pieter Spronck, GPLv2)
source_kind: primary-source-extract
blockers: []
---

# ST mechanics extract → Skiff Run rules MD

Mechanical source of truth analysis of **Palm Space Trader 1.2.0** (Pieter Spronck, GPLv2).
Method: read C structs/tables/formulas → structured Markdown → implement later in JS.
**This folder is docs only** — no engine port in this PR.

Local mirror used for citations: `/workspace/ref/spacetrader-src/`
(`DataTypes.h`, `Global.c`, `spacetrader.h`, `Traveler.c`, `Encounter.c`, `Skill.c`).

## Index

| File | Contents |
|------|----------|
| [politics.md](politics.md) | `Politics[]` rows — strengths, drugs/firearms, wanted goods |
| [tradeitems.md](tradeitems.md) | `Tradeitem[]` fields + rows |
| [ships.md](ships.md) | `Shiptype[]` buyable + special hulls |
| [gadgets-weapons-shields.md](gadgets-weapons-shields.md) | Weapons / shields / gadgets tables |
| [police-record.md](police-record.md) | Score thresholds, deltas, `STRENGTHPOLICE` |
| [encounters.md](encounters.md) | Encounter types, spawn chances, button state machine |
| [pricing.md](pricing.md) | `StandardPrice` / status / trader skill |
| [autofuel-travel.md](autofuel-travel.md) | Warp, fuel, AutoFuel / AutoRepair |
| [LICENSE-NOTE.md](LICENSE-NOTE.md) | GPL vs MIT for numbers vs paraphrases |
| [RELICENSE.md](RELICENSE.md) | Recommend GPLv2 when engine ports exact tables |

## Skiff policy

- Title stays **Skiff Run**; credit Spronck publicly (`CREDITS.md`).
- Keep Skiff system/hull/good names in product; ST names documented here as mechanical reference.
- Exact numeric tables in this dump → treat as GPL-origin data; see RELICENSE.md before wiring into JS engine.
- Do **not** paste entire `.c` files into the repo.

## Still TODO (not in this dump)

- Full quest / special-event state machines (`SpecialEvent[]` titles only noted)
- Complete combat math beyond hit/damage sketch (`ExecuteAttack` details for flee rounds, plunder, bribe costs)
- Opponent generation (`GenerateOpponent`) full ship/equipment rolls
- Galaxy generation, wormhole placement, quantity regen formulas in depth
- Newspaper / masthead systems
- High-score / end-game scoring edge cases
