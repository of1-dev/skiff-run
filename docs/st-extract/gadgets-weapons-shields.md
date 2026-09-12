---
title: Weapons, shields, gadgets
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Global.c:207-235; spacetrader.h:115-145; DataTypes.h:56-79
---

# Equipment tables

## Weapons (`Global.c:207-214`)

Power constants: Pulse 15, Beam 25, Military 35, Morgan 85 (`spacetrader.h:117-124`).

| Name | Power | Price | Tech | Chance% |
|------|-------|-------|------|---------|
| Pulse laser | 15 | 2000 | 5 | 50 |
| Beam laser | 25 | 12500 | 6 | 35 |
| Military laser | 35 | 35000 | 7 | 15 |
| Morgan's laser | 85 | 50000 | 8 | 0 (quest) |

## Shields (`Global.c:217-223`)

| Name | Power | Price | Tech | Chance% |
|------|-------|-------|------|---------|
| Energy shield | 100 | 5000 | 5 | 70 |
| Reflective shield | 200 | 20000 | 6 | 30 |
| Lightning shield | 350 | 45000 | 8 | 0 (quest / egg) |

Hull upgrade constant: `UPGRADEDHULL = 50` (`spacetrader.h:136`).

## Gadgets (`Global.c:226-235`)

| Name | Price | Tech | Chance% | Mechanical effect (from Skill.c / comments) |
|------|-------|------|---------|-----------------------------------------------|
| 5 extra cargo bays | 2500 | 4 | 35 | +5 holds |
| Auto-repair system | 7500 | 5 | 20 | +`SKILLBONUS` (3) to Engineer (`Skill.c:346-347`) |
| Navigating system | 15000 | 6 | 20 | +3 Pilot (`Skill.c:320-321`) |
| Targeting system | 25000 | 6 | 20 | +3 Fighter (`Skill.c:296-297`) |
| Cloaking device | 100000 | 7 | 5 | +`CLOAKBONUS` (2) Pilot; cloak if eng > opp (`Traveler.c:2505-2508`) |
| Fuel compactor | 30000 | 8 | 0 | Quest; extends tank capacity (impl. outside this extract) |

Slot caps on player ship: `MAXWEAPON/SHIELD/GADGET = 3` (`spacetrader.h:212-214`).
