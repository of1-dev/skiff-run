---
title: Police record & reputation
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Global.c:48-74; spacetrader.h:349-386,465
---

# Police record

## Score thresholds (`spacetrader.h:365-373`, table `Global.c:48-60`)

| Band | MinScore | Notes |
|------|----------|-------|
| Psycho | −100 | table floor |
| Villain | PSYCHOPATHSCORE (−70) | |
| Criminal | VILLAINSCORE (−30) | |
| Crook | CRIMINALSCORE (−10) | |
| Dubious | DUBIOUSSCORE (−5) | fence / criminal pricing kicks in below this |
| Clean | CLEANSCORE (0) | |
| Lawful | LAWFULSCORE (5) | |
| Trusted | TRUSTEDSCORE (10) | |
| Liked | HELPERSCORE (25) | |
| Hero | HEROSCORE (75) | |

## Action deltas (`spacetrader.h:351-362`)

| Action | Δ score |
|--------|---------|
| Attack police | −3 |
| Kill police | −6 |
| Caught with Wild | −4 |
| Attack trader | −2 |
| Plunder trader | −2 |
| Kill trader | −4 |
| Attack pirate | 0 |
| Kill pirate | +1 |
| Plunder pirate | −1 |
| Trafficking | −1 |
| Flee inspection | −2 |
| Take Marie narcotics | −4 |

## `STRENGTHPOLICE` (`spacetrader.h:465`)

Effective police strength for system `a`:

- If `PoliceRecordScore < PSYCHOPATHSCORE (−70)` → **3×** politics StrengthPolice
- Else if `< VILLAINSCORE (−30)` → **2×**
- Else → **1×** base

Used in encounter spawn bands (`Traveler.c:1875-1884`).

## Criminal pricing

- `PoliceRecordScore < DUBIOUSSCORE`: sell prices ×90/100 (intermediary); buy rebuilt from sell (`Traveler.c:465-468`, `Skill.c:155-160`).

## Reputation (kills ladder) (`Global.c:63-74`, `spacetrader.h:378-386`)

Harmless 0 → Mostly harmless 10 → Poor 20 → Average 40 → Above average 80 → Competent 150 → Dangerous 300 → Deadly 600 → Elite 1500.

Affects whether police/pirates attack or flee (`Traveler.c:1926-2013`).

## Decay / recovery on warp (`Traveler.c:580-589`)

- Every 3 days: if score > Clean, −1 (toward Clean).
- If criminal (`< Dubious`): +1 per day on ≤Normal; else every `Difficulty` days.
