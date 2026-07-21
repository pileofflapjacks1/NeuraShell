# AGENTS.md — NeuraShell

You are working on **NeuraShell only** unless the user asks to edit another suite repo.

## Product

Computer-side **control plane** for high-bandwidth intent users (modes, panic, profiles, session ready).  
Not implant software. Not medical. Not Neuralink-affiliated. Not Binder (TCG). Not NFA (flow). Not Beach (catalog).

## v0.2 boundaries

- Simulator-first: synthetic + keyboard always work.
- Optional Bridge: soft WS / BroadcastChannel only; degrade if missing.
- Intent vocab: `velocity_2d` | `class_label` | `switch_binary` | `synthetic`.
- Outputs: `ui_only` (in-shell preview). No full OS hijack required.
- Freeze UI: STOP/HOLD → freezeReason + FreezeOverlay; panic bar remains above.
- Calibration: `/calibrate` writes profile (+ `calibratedAt`); no cloud.
- Do not add implant SDKs, medical features, accounts, or monorepo merges.

## Layout

```
src/app/           routes: / /demo /calibrate /a11y /settings
src/components/    panic-bar, freeze-overlay, calibration-wizard, …
src/lib/intents/   types + adapters
src/lib/profiles/  JSON schema + localStorage
src/lib/bridge/    optional remote stub
src/lib/store.ts   Zustand
```

## Commands

```bash
pnpm dev
pnpm build
pnpm test
```

## Commits

Author: Joe \<pileofflapjacks1@gmail.com\>

## Beach re-seed

After deploy, update absolute `/demo` URL in `LISTING.md` + `neurabeach-manifest.json`, then a Beach-only pass adds `seed-proj-neurashell` to `col-neura-suite`.
