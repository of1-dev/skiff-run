---
title: Skiff Run hull roster
created: 2026-09-11
updated: 2026-09-11
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

## Live (0.4.x)

| id | role | SVG |
|----|------|-----|
| `skiff-7` | starter light freighter | `assets/hulls/skiff-7.svg` |
| `hold-barge` | cargo hauler | `assets/hulls/hold-barge.svg` |
| `ember-cutter` | armed cutter | `assets/hulls/ember-cutter.svg` |

## Planned common classes (SVGs on disk; stats TBD)

Mechanical homage slots (original names only):

| id | role sketch | SVG |
|----|-------------|-----|
| `mite` | cheapest short-hopper | `mite.svg` |
| `glass-dart` | fast courier | `glass-dart.svg` |
| `ash-lance` | pirate-hunter / bounty | `ash-lance.svg` |
| `knot-hauler` | mid cargo | `knot-hauler.svg` |
| `tide-runner` | balanced multi-role | `tide-runner.svg` |
| `quiet-ark` | late tank / retire ferry | `quiet-ark.svg` |
| `wasp-prime` | endgame war hull | `wasp-prime.svg` |

## Faction exclusives (parked)

Only if chart powers land:

- **Ash Corsairs** — prize lance variant
- **Ledger Wardens** — inspection cutter
- **Ember Compact** — bonded courier

Everything else stays common.
