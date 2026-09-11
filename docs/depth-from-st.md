---
title: Skiff Run depth plan (from Space Trader mechanics)
created: 2026-09-11
updated: 2026-09-11
type: design
status: active
dest: of1
source: historicalsource/spacetrader (GPL); mechanical homage only
source_kind: primary-source-extract
blockers: []
---

# Skiff Run depth — ST mechanical extract

**IP:** Steal structure and formulas only. No ST system names (many TNG-flavored), no Palm homage branding in public UI.

Primary sources: `github.com/historicalsource/spacetrader` (`DataTypes.h`, `Global.c`, `Traveler.c`, `Encounter.c`, …).

## What made ST deep

- Systems = **Tech + Politics + Size + SpecialResources + Status** (not flavor text)
- Politics drives **police / pirate / trader spawn** and price pressure
- Trade goods have tech gates, status spikes, resource cheap/expensive mods
- Encounters use Pilot / Fighter / Trader / Engineer (max of crew) + weapons/shields/gadgets
- Criminal record scales police hostility and fences sales
- Win: buy moon (~500k) and retire

## Chart truth (important)

Classic ST did **not** color-code the galactic chart by risk/reward. It used:

- visited vs unvisited glyphs
- Execute Warp text: size, tech, gov, police activity, pirate activity
- Average Price List relative mode (expected margin)

**Skiff upgrade:** color Activity + margin on the Local/Sector chart.

## Gadgets (mechanical)

Extra cargo bays, auto-repair (+eng), navigating (+pilot), targeting (+fighter), cloaking (eng gate), escape pod (not a slot).

## Phased Skiff slices

### Slice 1 — Chart risk/reward colors (next)
System fields: tech, gov archetype, size, policeStrength, pirateStrength, visited.
Node color = f(pirate risk [, police if hot cargo]).
Fog resources until visited.

### Slice 2 — Target dossier + relative margins
Warp-panel analogue on target card; expected margin vs current buys.

### Slice 3 — Thin encounters tied to colors
Travel ticks: pirate / patrol / trader; Fight/Flee/Submit stubs; small hull quieter.

**Defer:** full ship tree unlocks, full gadget matrix, criminal economy, moon win, quest bosses.

## Already shipped (context)

- Fold shell + Local/Sector chart (0.3.x)
- Theme packs Cobalt / Coffee / LCARS (0.4.0)
- Hull SVGs + common class roster stubs (0.4.1)
- Hulls are **common** (ST had no named factions — politics + encounter roles)

