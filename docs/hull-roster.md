---
title: Skiff Run hull roster
created: 2026-09-11
updated: 2026-09-13
type: design
status: draft
dest: of1
---

# Hull roster (SVG classes)

## Factions (clarifier)

Classic Palm **Space Trader** did **not** use named factions. Depth came from:

- per-system **politics** (anarchy → military, etc.)
- encounter roles: **police / pirates / traders**
- ship classes shared at yards by tech level

Named-faction fantasy is closer to **Hex Wake / Space Wars** energy. For Skiff we can add light **chart powers** later without cloning ST branding.

## Design rule

- **Common classes** — buyable at yards (tech / wealth gated later). Same SVG for all captains.
- **Exclusives** (optional later) — Corsair prize hull, Warden patrol refit, Compact courier — same base SVG + badge/tint, or a unique path.

## Hull scale (locked 2026-09-13)

Relative size for docs / yard talk. Solo viewport fills lie — use this sheet.

![Ember Hull Scale Chart](../assets/docs/ember-hull-scale.png)

| Hull | Scale |
|------|------:|
| Mite | 1.0 |
| Unbowed | 1.15 |
| Glass Dart | 1.3 |
| Skiff-7 | 1.5 |
| Ember Cutter | 1.7 |
| Ash Lance | 1.8 |
| Tide Runner | 2.4 |
| Knot Hauler | 2.8 |
| Hold Barge | 3.2 |
| Wasp Prime | 3.6 |
| Quiet Ark | 4.0 |

**Unbowed** is in the Ember keep pack (art + scale + SVG). Buyable unlock still parked — not open Yard stock.

### Yard stock (0.9.2)

- **Full yard** (`yard: true`): all commons (not Unbowed).
- **Mite scrap**: most non-yard docks when tech ≥ Craft (2) and pirate &lt; 6.
- **Dry dock**: tech ≤ 1, or pirate ≥ 6 without a real yard — market + dock work only.
- Soft-fail: dock work ₩400 once per stay; Mite Take can jettison overflow; trade-down pays scrap surplus.

## Live Yard commons (0.9.2)

| id | role | cargo | fuel | range | guns | crew | list ₩ |
|----|------|------:|-----:|------:|:----:|-----:|-------:|
| `mite` | escape short-hopper | 10 | 10 | 20 | no | 1 | 0 |
| `skiff-7` | starter light freighter | 20 | 14 | 28 | no | 1 | 0 |
| `glass-dart` | fast courier | 12 | 16 | 42 | no | 1 | 4500 |
| `tide-runner` | balanced multi-role | 24 | 16 | 34 | no | 2 | 7000 |
| `knot-hauler` | mid cargo | 32 | 17 | 30 | no | 3 | 8000 |
| `hold-barge` | fat hauler | 40 | 18 | 32 | no | 3 | 9000 |
| `ember-cutter` | armed cutter | 16 | 16 | 38 | yes | 2 | 12000 |
| `ash-lance` | pirate-hunter | 14 | 18 | 40 | yes | 2 | 15000 |
| `quiet-ark` | late tank / ferry | 50 | 22 | 36 | no | 4 | 22000 |
| `wasp-prime` | endgame war | 18 | 20 | 44 | yes | 3 | 28000 |
| `unbowed` | gated compact war | — | — | — | — | — | unlock later |

SVGs: `assets/hulls/<id>.svg` (Unbowed art ships; buy does not).

## Faction exclusives (parked)

Only if chart powers land:

- **Ash Corsairs** — prize lance variant
- **Ledger Wardens** — inspection cutter
- **Ember Compact** — bonded courier

Everything else stays common.

## Encounter profiles (by hull)

Lane heat is **not** one roll for every ship. Profile knobs (batch-build with reputation + deeper encounters):

| Knobs | Effect |
|-------|--------|
| **Signature** | How noticeable you are (cargo bulk, weapons lit, class size) |
| **Prey value** | Corsairs prefer fat holds; ignore empty mites sometimes |
| **Threat** | Armed / high Ember → more fight, fewer easy shakes; Wardens still care about Ledger |
| **Quiet running** | Small unarmed freighters (Skiff-7, Mite) → fewer rolls overall (ST Flea-style) |

Rough intent:

- **Mite / Skiff-7** — low signature; rare capital-scale events; more ignore / small trader hails
- **Hold Barge / Knot Hauler** — high prey value; Corsairs lean in; Wardens inspect cargo more
- **Ember Cutter / Ash Lance** — higher threat; Corsairs may flee or fight hard; fewer “shake down the soft target” beats
- **Wasp Prime / Quiet Ark** — endgame signature; special patrol attention + denser encounters when present

0.6.0 already has a thin stub (`cargo <= 20 && !weapons` quieter). Full matrix lands with the meaty systems chunk — no postage-stamp PR.
