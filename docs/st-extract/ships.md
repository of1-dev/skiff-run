---
title: Shiptype[] — hulls
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Global.c:186-204; DataTypes.h:92-111; spacetrader.h:108-113
---

# Ship types

Struct (`DataTypes.h:92-111`): CargoBays, Weapon/Shield/Gadget slots, CrewQuarters, FuelTanks (range capacity), MinTechLevel, CostOfFuel, Price, Bounty, Occurrence %, HullStrength, Police/Pirates/Traders encounter thresholds (−1 never), RepairCosts, Size (hitability).

`MAXSHIPTYPE = 10` buyable; +5 extras (`EXTRASHIPS`).

## Buyable (`Global.c:188-197`)

| Name | Bays | W | S | G | Crew | Fuel | MinTech | FuelCost | Price | Bounty | Occ% | Hull | Pol | Pir | Trd | Repair | Size |
|------|------|---|---|---|------|------|---------|----------|-------|--------|------|------|-----|-----|-----|--------|------|
| Flea | 10 | 0 | 0 | 0 | 1 | 20 | 4 | 1 | 2000 | 5 | 2 | 25 | −1 | −1 | 0 | 1 | 0 |
| Gnat | 15 | 1 | 0 | 1 | 1 | 14 | 5 | 2 | 10000 | 50 | 28 | 100 | 0 | 0 | 0 | 1 | 1 |
| Firefly | 20 | 1 | 1 | 1 | 1 | 17 | 5 | 3 | 25000 | 75 | 20 | 100 | 0 | 0 | 0 | 1 | 1 |
| Mosquito | 15 | 2 | 1 | 1 | 1 | 13 | 5 | 5 | 30000 | 100 | 20 | 100 | 0 | 1 | 0 | 1 | 1 |
| Bumblebee | 25 | 1 | 2 | 2 | 2 | 15 | 5 | 7 | 60000 | 125 | 15 | 100 | 1 | 1 | 0 | 1 | 2 |
| Beetle | 50 | 0 | 1 | 1 | 3 | 14 | 5 | 10 | 80000 | 50 | 3 | 50 | −1 | −1 | 0 | 1 | 2 |
| Hornet | 20 | 3 | 2 | 1 | 2 | 16 | 6 | 15 | 100000 | 200 | 6 | 150 | 2 | 3 | 1 | 2 | 3 |
| Grasshopper | 30 | 2 | 2 | 3 | 3 | 15 | 6 | 15 | 150000 | 300 | 2 | 150 | 3 | 4 | 2 | 3 | 3 |
| Termite | 60 | 1 | 3 | 2 | 3 | 13 | 7 | 20 | 225000 | 300 | 2 | 200 | 4 | 5 | 3 | 4 | 4 |
| Wasp | 35 | 3 | 2 | 2 | 3 | 14 | 7 | 20 | 300000 | 500 | 2 | 200 | 5 | 6 | 4 | 5 | 4 |

## Special / unbuyable (`Global.c:198-203`)

| Name | Notes |
|------|-------|
| Space monster | Hull 500, 3 weapon slots, quest boss |
| Dragonfly | Hull 10, heavy shields in instance data |
| Mantis | Hull 300, Gemulon invasion / artifact |
| Scarab | Hull 400, pulse/Morgan lasers only damage |
| Bottle | Hull 10, rare encounter prop |

Ship buy price macro: `BASESHIPPRICE` reduces by trader skill (`spacetrader.h:453`).

Skiff hull roster is separate fiction (`docs/hull-roster.md`); use these numbers for mechanical parity, not ST insect names in UI.
