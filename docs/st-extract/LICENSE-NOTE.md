---
title: License note for ST extract numbers
created: 2026-09-12
updated: 2026-09-12
type: policy
status: active
source: Pieter Spronck Space Trader GPLv2; of1 MIT repo
---

# LICENSE-NOTE

Exact numeric tables and formulas documented under `docs/st-extract/` **originate in** Pieter Spronck’s **Space Trader** (GPLv2).

| What | Likely license impact |
|------|------------------------|
| Structured MD tables with **verbatim ST numbers** (prices, strengths, hull stats) | GPL-origin data. Shipping those numbers inside a Skiff **engine** (JS that plays identically from copied tables) should move that derivative to **GPL**. |
| Clean-room **paraphrases** of *behavior* without copying tables (e.g. “politics affects police spawn”) | Can stay **MIT** with credit. |
| Original Skiff fiction, Fold UI, hull art, Ember names | of1 MIT / original. |

This docs-only PR **does** include verbatim table numbers for honest remake parity. Repo root `LICENSE` stays **MIT** for now; see [RELICENSE.md](RELICENSE.md) before engine port.

Credit: https://www.spronck.net/spacetrader/ — https://github.com/historicalsource/spacetrader
