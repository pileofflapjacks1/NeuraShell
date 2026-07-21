# AGENTS.md — NeuraShell

You are working on **NeuraShell only** unless the user asks to edit another suite repo.

## Product

Computer-side **control plane** for high-bandwidth intent users.  
**MVP shipped:** 0.4.0 — see `SHIP.md`, `CHANGELOG.md`, `docs/WHAT-IS-NEURASHELL.md`.

Not implant software. Not medical. Not Neuralink-affiliated.  
Not Binder (TCG). Not NFA (flow). Not Beach (catalog).

## MVP boundaries (0.4.0)

- Simulator-first: synthetic + keyboard always work.
- Optional Bridge: soft WS / BroadcastChannel only.
- Intent vocab: `velocity_2d` | `class_label` | `switch_binary` | `synthetic`.
- Outputs: `ui_only` + optional `os_mouse` (dry-run / local POST).
- Actuate OS: dry-run default; live needs ARM + Safe confirm; STOP → dry-run.
- Freeze UI, calibration, readiness + ARM, record/replay — all in scope as shipped.
- Do **not** add implant SDKs, medical features, accounts, monorepo merges, or cloud neural data without explicit ask.

## Layout

```
src/app/           / /demo /calibrate /a11y /settings
src/components/    panic, freeze, session-ready, actuate-os, …
src/lib/intents/   adapters + recording
src/lib/os-actuate/  Intent→OS samples
src/lib/profiles/  local JSON
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
