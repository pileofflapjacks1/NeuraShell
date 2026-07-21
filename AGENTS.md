# AGENTS.md — NeuraShell

You are working on **NeuraShell only** unless the user asks to edit another suite repo.

## Product

Computer-side **control plane** for high-bandwidth intent users (modes, panic, profiles, session ready).  
Not implant software. Not medical. Not Neuralink-affiliated. Not Binder (TCG). Not NFA (flow). Not Beach (catalog).

## v0.4 boundaries

- Simulator-first: synthetic + keyboard always work.
- Optional Bridge: soft WS / BroadcastChannel only; degrade if missing.
- Intent vocab: `velocity_2d` | `class_label` | `switch_binary` | `synthetic`.
- Outputs: `ui_only` + optional `os_mouse` via dry-run / local POST (never implant).
- Actuate OS: default dry-run; live requires ARM + Safe confirm; STOP → dry-run.
- Relay: `pnpm os:relay` → `scripts/os-intent-relay.mjs` on :8765.
- Freeze UI: STOP/HOLD → freezeReason + FreezeOverlay; panic bar remains above.
- Calibration: `/calibrate` writes profile (+ `calibratedAt`); no cloud.
- Readiness: `lib/readiness.ts` score; ARM required for shell actuation (except replay/cal).
- Record/replay: local JSON only (`lib/intents/recording.ts`); STOP cancels replay.
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
