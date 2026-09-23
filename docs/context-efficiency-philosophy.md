---
title: Context Efficiency & Architectural Filing Philosophy (Tokens vs. Tools vs. Skills)
created: 2026-09-22
type: design-memo
status: active
audience: builder
---

# Context Efficiency & Architectural Filing Philosophy

## 1. The Core Insight
> **"Context is king. Heavy instructions eat window on every turn. Skills hide context until triggered. Tools cost near-zero tokens on idle, but carry disproportionate leverage."**

Every token loaded into system prompt, `CLAUDE.md`, or static agent instructions is a **tax paid on every single conversational turn**. In long architectural sessions, this tax creates:
1. **Context Bloat & Degradation:** Dilutes attention over multi-turn pair programming.
2. **Context Fragmentation:** Outdated directives pollute reasoning when state changes.
3. **High Latency & Token Waste:** Incurring thousands of repeated tokens per step.

Like a physical filing cabinet or indexed library: **the best system is not the one with all books open on the desk, but the one with an exact index on the desk and deep manuals pulled only when that drawer is opened.**

---

## 2. The Triad: Context vs. Skills vs. Tools

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Zero-Cost / Negligible Token Layer: TOOLS                │
│    - CLI commands, test runners, git, filesystem read/edit  │
│    - Fixed JSON schema in context (~a few dozen tokens)     │
│    - Execute deterministically on metal                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Just-In-Time (JIT) Layer: SKILLS & ON-DEMAND DOCS       │
│    - Compact registry summary (~20 tokens per skill)        │
│    - Full instructions (SKILL.md, docs/*.md) read ONLY      │
│      when triggered by need                                 │
│    - Leaves working context pristine until relevant         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Per-Turn Tax Layer: ALWAYS-ON INSTRUCTIONS               │
│    - System prompts, root guidelines, large READMEs         │
│    - Paid every turn regardless of relevance                │
│    - RULE: Keep minimal, lean, and index-oriented           │
└─────────────────────────────────────────────────────────────┘
```

### Comparative Dynamics

| Mechanism | Per-Turn Token Cost | Information Density | Execution Reliability | Best Used For |
| :--- | :--- | :--- | :--- | :--- |
| **Always-On Context** (`CLAUDE.md`, System Prompts) | **Very High** (Accumulates every turn) | Low (must be generic to cover entire lifecycle) | Subject to attention drift in long sessions | Global non-negotiables, file map pointers |
| **Skills / On-Demand Markdown** | **Near-Zero** when idle; **Targeted** when invoked | High (specialized, exhaustive runbooks & schemas) | Extremely high when read immediately before action | Deep domain procedures, specific refactor recipes |
| **Tools** (CLI, scripts, linters, tests) | **Near-Zero** (Schema definition only) | Maximum (deterministic code on metal) | 100% deterministic (no model hallucination) | Verification, compilation, test suites, state queries |

---

## 3. Practical Rules for Skiff & Dual-Agent Workflows

1. **Keep Root Guidance Lean (Index-First):**
   * Root docs should point to specialized docs in `docs/` rather than inlining thousands of words of API specs.
   * Treat `docs/code-map.md` as an index card, not an encyclopedia.
2. **Push Logic to Executable Tools & Scripts:**
   * Instead of explaining complex lint or test rules in prose, run `npm test` or `scripts/check-line-caps.sh`.
   * Let exit code 0 or error logs provide grounded feedback on demand.
3. **Specialized Tasks Belong in Skills / Focused Docs:**
   * e.g., Holo projection math, market pricing curves, and bridge socket protocols shouldn't live in the main prompt. They live in their respective modules and accompanying `test/acceptance/*.test.js` files.
4. **The Metal Truth Principle:**
   * When sharing state between agents (e.g. AGY and Grok), write progress and specifications to disk (`docs/agent-review-log.md`, `GROK_TASK.md`). Files on metal are permanent, verifiable, and free of conversational drift.
