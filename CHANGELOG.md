# Changelog

All notable changes to **NeuraShell** are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)-inspired. Versioning: semver.

## [Unreleased]

### Fixed
- Enter and Space on a focused button or link activate that control again. The keyboard sim no longer cancels them or stacks a confirm intent on top.
- ⌘ / Ctrl / Alt chords pass through to the browser. Held Enter, K, and 1–4 no longer repeat.
- Held arrow / WASD keys are dropped when the window loses focus, so velocity cannot stick.
- Undoing a safe mode toggle updates the saved profile too.

### Safety
- Stopping the session drops OS live to dry-run. Re-ARM does not bring live back without a fresh confirm.
- A stop intent lands while HOLD is active (keyboard, replay, or Bridge).
- ARM needs a session that is delivering intents. Bridge connecting and Bridge lost no longer pass the "Intent session" factor.
- UNDO will not undo a mode change while STOP or HOLD is active. Release first.
- The shell and the OS path use one click threshold (Safe mode included). An accepted click is emitted at 0.85 or above, the Intent→OS default. A rejected click is not sent.
- OS velocity is only sent in point and click modes. Dry-run also previews in idle.
- STOP, HOLD, disarm, session stop, and Bridge loss send one zero sample when OS live was on, so a receiver stops moving.
- The Actuate OS panel no longer shows a `stop ←` mapping that nothing reads.

---

## [0.6.0] — 2026-10-04 — Undo timeline

### Added
- The panic bar lists the undo stack newest first. Each row has a plain-language label (mode, typed character, click target, or safe mode) and a time. Entries that arrive without a time get one.
- UNDO, ⌘Z / Ctrl+Z, and the newest row each pop one entry through the existing undo path. Older rows are not a shortcut. There is no redo.
- An empty stack says there is nothing to undo. STOP and HOLD stay on the bar.

### Safety
- ARM, OS live, and Bridge link changes are not undo entries. Dry-run stays the default.
- Bridge health is unchanged: connecting / open / lost, backoff reconnect, and HOLD plus OS live to dry-run when the socket drops while armed.

---

## [0.5.1] — 2026-10-04 — Bridge health

### Fixed
- Try Bridge no longer marks the session "Bridge remote" before the socket opens. The badge is **connecting**, **open** ("Bridge remote"), or **lost**, and shows last message age.
- WebSocket `onerror` / `onclose` reconnect with backoff (`500ms` … `8s`). On loss the status says so and the session falls back to the keyboard. Synthetic and keyboard still run with no Bridge process.
- If the socket drops while armed, the shell **HOLDs** and drops OS live to dry-run — the same live-path cut STOP already uses. A dead stream does not keep actuating. Reconnect does not release HOLD or turn live back on.

### Safety
- Soft path only: `ws://127.0.0.1:7711` and BroadcastChannel `neurabridge-intent`. No Neurabridge package. Dry-run stays the default.

---

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
