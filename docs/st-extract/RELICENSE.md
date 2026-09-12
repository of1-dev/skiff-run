---
title: Relicense recommendation (engine port)
created: 2026-09-12
updated: 2026-09-12
type: policy
status: recommendation
dest: of1
blockers: ["Andrew confirm before flipping root LICENSE"]
---

# RELICENSE — recommend GPLv2 when engine ports tables

## Recommendation

When Skiff Run’s JS engine loads or hard-codes the **exact** politics / trade-item / ship / equipment / score tables from this extract (or equivalent dumps of Spronck’s `Global.c`), treat that runtime as a **GPLv2 derivative** of Space Trader and:

1. Open a dedicated **relicense PR** (do not silently flip in a mechanics commit).
2. Change root `LICENSE` to **GPLv2** (or GPLv2-or-later, matching ST), with Andrew’s confirm.
3. Keep CREDITS + Spronck / historicalsource links prominent.
4. Optionally dual-document: MIT for pure of1 UI assets if legally split — default simple path is **whole game repo GPLv2** once tables ship in engine.

## This PR

- **Docs dump only** — MD under `docs/st-extract/`.
- Root `LICENSE` **remains MIT**.
- Do **not** merge an engine port of these numbers under MIT without the relicense PR.

## Clean-room alternative

If Andrew prefers MIT forever: re-author *different* numbers with similar *roles* (police strength bands, tech-gated goods) without copying ST’s exact rows. Homage credit still applies; mechanical parity will diverge.
