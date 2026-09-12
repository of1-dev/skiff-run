---
title: Politics[] — governments
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Global.c:335-354; DataTypes.h:146-158; spacetrader.h:304-306
---

# Politics (governments)

Struct (`DataTypes.h:146-158`):

| Field | Meaning |
|-------|---------|
| Name | Display name |
| ReactionIllegal | Police reaction to illegal cargo (0 = tolerant) |
| StrengthPolice | Base police activity 0–7 (`Activity[]`) |
| StrengthPirates | Pirate activity 0–7 |
| StrengthTraders | Trader activity 0–7 (also lowers prices) |
| MinTechLevel / MaxTechLevel | Where this gov can appear |
| BribeLevel | Bribe ease (0 = hard/unbribeable) |
| DrugsOK / FirearmsOK | Whether narcotics / firearms trade |
| Wanted | Trade-item index especially demanded (−1 none) |

## Rows (`Global.c:335-354`)

| # | Name | Ill | Pol | Pir | Trd | MinT | MaxT | Bribe | Drugs | Firearms | Wanted |
|---|------|-----|-----|-----|-----|------|------|-------|-------|----------|--------|
| 0 | Anarchy | 0 | 0 | 7 | 1 | 0 | 5 | 7 | Y | Y | Food |
| 1 | Capitalist State | 2 | 3 | 2 | 7 | 4 | 7 | 1 | Y | Y | Ore |
| 2 | Communist State | 6 | 6 | 4 | 4 | 1 | 5 | 5 | Y | Y | — |
| 3 | Confederacy | 5 | 4 | 3 | 5 | 1 | 6 | 3 | Y | Y | Games |
| 4 | Corporate State | 2 | 6 | 2 | 7 | 4 | 7 | 2 | Y | Y | Robots |
| 5 | Cybernetic State | 0 | 7 | 7 | 5 | 6 | 7 | 0 | N | N | Ore |
| 6 | Democracy | 4 | 3 | 2 | 5 | 3 | 7 | 2 | Y | Y | Games |
| 7 | Dictatorship | 3 | 4 | 5 | 3 | 0 | 7 | 2 | Y | Y | — |
| 8 | Fascist State | 7 | 7 | 7 | 1 | 4 | 7 | 0 | N | Y | Machines |
| 9 | Feudal State | 1 | 1 | 6 | 2 | 0 | 3 | 6 | Y | Y | Firearms |
| 10 | Military State | 7 | 7 | 0 | 6 | 2 | 7 | 0 | N | Y | Robots |
| 11 | Monarchy | 3 | 4 | 3 | 4 | 0 | 5 | 4 | Y | Y | Medicine |
| 12 | Pacifist State | 7 | 2 | 1 | 5 | 0 | 3 | 1 | Y | N | — |
| 13 | Socialist State | 4 | 2 | 5 | 3 | 0 | 5 | 6 | Y | Y | — |
| 14 | State of Satori | 0 | 1 | 1 | 1 | 0 | 1 | 0 | N | N | — |
| 15 | Technocracy | 1 | 6 | 3 | 6 | 4 | 7 | 2 | Y | Y | Water |
| 16 | Theocracy | 5 | 6 | 1 | 4 | 0 | 4 | 0 | Y | Y | Narcotics |

`MAXPOLITICS = 17` (`spacetrader.h:305`). Activity labels: Absent…Swarms (`Global.c:118-128`).

## Skiff rename map (later)

Keep ST names in this extract. Product fiction may map e.g. Anarchy→Open Claim, Corporate State→Consortium, Theocracy→Covenant — decide in a skin PR; do not rename here.

## Notes

- `Wanted == Good` → price ×4/3 in `StandardPrice` (`Traveler.c:119-120`).
- Drugs/Firearms gates zero buy/sell when politics forbid (`Skill.c:150-152`, `Traveler.c:111-113`).
