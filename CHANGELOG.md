# Changelog

All notable changes to **NeuraShell** are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)-inspired. Versioning: semver.

## [0.5.0] — 2026-09-03 — Gym slice + hard ARM gate

### Added
- **12-minute gym** (`/gym`): honest gym **slice** default 180s (optional 720s cap). One action (click), N keyboard/synthetic trials, miss rate, optional remap on accept.
- Profile **mappings** (`click` / `confirm` / `stop` → `dwell` | `key` | `switch` | `confirm`) plus `lastGymAt`, `lastGymMissRate`, `gymRemap`. Schema **0.3.0** migrates 0.1/0.2 profiles.
- Session Ready one-liner when gym remapped click; blocked copy + buttons to `/gym` and `/calibrate`.
- Drift nudge: 60s of bad rolling confidence while armed surfaces **Run gym** and auto-HOLD. No silent remap.

### Changed
- **Session Ready is a hard ARM gate.** `calibrated` is required when never gym'd, gym older than 7 days, or last miss rate > 35%. `canArm` is required factors only — the score ≥ 55 bypass is gone. `arm()` no-ops if `!canArm`.
- Live OS POST also requires gym mapping (`mappings.click`) plus ARM + Safe confirm. Dry-run preview shows which mapping would fire. STOP still forces dry-run.

### Safety
- Fail closed: fresh profile cannot ARM; cannot live-actuate without gym mapping.
- Remap never auto-applies.

---

## [0.4.0] — 2026-07-21 — **MVP ship**

### Added
- **Actuate OS** panel: dry-run sample preview (default path); optional live POST to local Intent→OS-style endpoint
- Local relay script: `pnpm os:relay` → `scripts/os-intent-relay.mjs` (`http://127.0.0.1:8765/intent`)
- Intent → OS sample mapper (`vx`, `vy`, `click`, `t`)

### Safety
- Live OS requires shell **ARM** + Safe-mode confirm
- **STOP** / **DISARM** force live → dry-run
- HOLD/STOP block OS emission

### Docs
- README Actuate OS section; manifest `outputs` includes `os_mouse` (adapter path)
- Suite one-pager: `docs/WHAT-IS-NEURASHELL.md`
- Ship notes: `SHIP.md`

---

## [0.3.0] — 2026-07-21

### Added
- Session **readiness score** (0–100) + factor checklist
- **ARM / DISARM** gate for intent actuation
- Local intent **record / replay** (export/import JSON)
- Demo tour steps for ARM + record

### Safety
- STOP disarms and cancels recording/replay
- Disarmed = monitoring only (confidence still updates)

---

## [0.2.0] — 2026-07-21

### Added
- **Freeze UI** overlay for STOP/HOLD (reason, timer, large RELEASE)
- **Calibration wizard** (`/calibrate`) → local profile + `calibratedAt`
- Profile schema 0.2.0 with migration from 0.1.0

---

## [0.1.0] — 2026-07-21

### Added
- Session Ready (synthetic / bridge-remote labels)
- Modes: `point` · `click` · `type` · `switch` · `idle`
- Panic bar: STOP · UNDO · HOLD (Esc / ⌘Z / Space)
- Synthetic + keyboard adapters; optional Bridge WS stub
- Local profiles export/import
- Routes: `/` · `/demo` · `/a11y` · `/settings`
- NeuraBeach catalog files: `LISTING.md`, `neurabeach-manifest.json`

---

## Links

- Live demo: https://neurashell-eta.vercel.app/demo  
- Beach: https://neurabeach.com/projects/neurashell  
- Repo: https://github.com/pileofflapjacks1/NeuraShell  
