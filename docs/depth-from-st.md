---
title: Skiff Run depth plan (from Space Trader mechanics)
created: 2026-09-11
updated: 2026-09-12
type: design
status: active
dest: of1
source: historicalsource/spacetrader (GPL); mechanical homage only
source_kind: primary-source-extract
blockers: []
---

# Skiff Run depth — ST mechanical extract

**IP:** Port structure and formulas from ST. Keep Skiff system/hull names (not ST’s TNG-flavored list). **Credit** Pieter Spronck / Space Trader publicly; title stays Skiff Run.

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


## Reputation vibe

See `docs/reputation-vibe.md` — dual Ledger/Ember axes (Firefly/Guardians tonal homage). Batch with next deep systems chunk.

## Hull-weighted encounters

See hull-roster.md — signature / prey / threat / quiet running. Partial stub in 0.6.0; full matrix with next systems batch.

## Mechanics extract (2026-09-12)

Structured table/formula dump (clean-room MD, file:line citations):

→ **[`docs/st-extract/`](st-extract/README.md)** — politics, trade items, ships, equipment, police record, encounters, pricing, autofuel/travel, license notes.

SoT policy: [`docs/st-mechanics-sot.md`](st-mechanics-sot.md). Relicense watch: [`docs/st-extract/RELICENSE.md`](st-extract/RELICENSE.md).

