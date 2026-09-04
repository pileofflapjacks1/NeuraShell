# AGENTS.md — NeuraShell

You are working on **NeuraShell only** unless the user asks to edit another suite repo.

## Product

Computer-side **control plane** for high-bandwidth intent users.  
**Shipped:** 0.5.0 — gym slice + hard ARM gate. See `SHIP.md`, `CHANGELOG.md`, `docs/WHAT-IS-NEURASHELL.md`.

Not implant software. Not medical. Not Neuralink-affiliated.  
Not Binder (TCG). Not NFA (flow). Not Beach (catalog).

## Boundaries (0.5.0)

- Simulator-first: synthetic + keyboard always work.
- Optional Bridge: soft WS / BroadcastChannel only.
- Intent vocab: `velocity_2d` | `class_label` | `switch_binary` | `synthetic`.
- Gestures (wizard/gym): `dwell` | `key` | `switch` | `confirm`.
- Outputs: `ui_only` + optional `os_mouse` (dry-run / local POST).
- Actuate OS: dry-run default; live needs ARM + Safe confirm + gym mapping; STOP → dry-run.
- Session Ready is a **hard ARM gate** (gym freshness required; no score bypass). `arm()` no-ops if `!canArm`.
- Freeze UI, calibration, `/gym` slice, record/replay — all in scope as shipped.
- Do **not** add implant SDKs, medical features, accounts, monorepo merges, or cloud neural data without explicit ask.

## Layout

```
src/app/           / /demo /calibrate /gym /a11y /settings
src/components/    panic, freeze, session-ready, actuate-os, …
src/lib/intents/   adapters + recording + gesture mapping
src/lib/gym.ts     slice scoring / freshness
src/lib/os-actuate/  Intent→OS samples
src/lib/profiles/  local JSON (mappings + gym stamp)
src/lib/store.ts   Zustand
docs/              WHAT-IS-NEURASHELL.md
SHIP.md            MVP ship checklist
CHANGELOG.md
```

## Commands

```bash
pnpm dev
pnpm test
pnpm build
pnpm os:relay   # optional local OS live POST target
```

## Commits

Author: Joe \<pileofflapjacks1@gmail.com\>

## Beach

Listing already live. Re-seed from `LISTING.md` + `neurabeach-manifest.json` when version or demo URL changes.
