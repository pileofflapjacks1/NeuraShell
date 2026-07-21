# NeuraShell

**Computer-side BCI control plane** for high-bandwidth *intent* users: mode switch, panic stop/undo, confidence, local profiles, session readiness.

Simulator-first. **Not** implant software. **Not** a Neuralink product. **Not** a medical device.

```
User
  ↓ NeuraShell  ← you are here (modes, panic, profiles, session ready)
  ↓ NeuralBridge (optional middleware / multi-client)
  ↓ Intent → OS / apps (Binder, etc.)
```

## Live

- **Demo tour:** https://neurashell-eta.vercel.app/demo  
- **Shell:** https://neurashell-eta.vercel.app/  
- **Beach listing:** https://neurabeach.com/projects/neurashell (after Beach deploy)

## Quick start

```bash
pnpm install
pnpm dev
```

- Shell: [http://localhost:3000](http://localhost:3000)
- Scripted tour: [http://localhost:3000/demo](http://localhost:3000/demo)
- Calibration: [http://localhost:3000/calibrate](http://localhost:3000/calibrate)
- A11y scorecard: [http://localhost:3000/a11y](http://localhost:3000/a11y)

```bash
pnpm build
pnpm test
```

No accounts. No env secrets for v0.1 demo.

## What ships in v0.4

| Area | Behavior |
|------|----------|
| **Session Ready** | connection labels + **readiness score (0–100)** + factor checklist |
| **ARM gate** | intent actuation only when ARMED (or during replay/calibration); STOP disarms |
| **Actuate OS** | dry-run preview (default path) · optional live POST to local Intent→OS-style endpoint |
| **Modes** | exactly one of `point` · `click` · `type` · `switch` · `idle` (Safe mode requires confirm) |
| **Panic bar** | STOP · UNDO · HOLD — sticky, large targets; Esc / ⌘Z / Space |
| **Freeze UI** | Full overlay for STOP/HOLD with reason, elapsed timer, large RELEASE |
| **Calibration** | `/calibrate` wizard → local profile (`calibratedAt`) |
| **Record / Replay** | local intent capture, export/import JSON, timeline replay |
| **Profiles** | localStorage + export/import JSON (NeuralBridge-friendly fields) |
| **Intents** | synthetic, keyboard, optional Bridge WS / BroadcastChannel |
| **Demo** | `/demo` scripted tour including ARM + record |

### Actuate OS (dry-run first)

```bash
# Terminal A — optional local relay for Live mode
pnpm os:relay
# → http://127.0.0.1:8765/intent

# Terminal B — Shell
pnpm dev
# Session Ready → synthetic → ARM → Actuate OS → Dry-run (log)
# Optional: Live (Safe confirm) → POSTs JSON {vx,vy,click,t}
```

Browser **cannot** move the system mouse by itself. Live mode only talks to localhost; pair with [Intent → OS](https://github.com/pileofflapjacks1/neurabeach/tree/main/packages/intent-to-os) or your own consumer of the relay NDJSON.

## Keyboard (sim)

| Key | Action |
|-----|--------|
| Arrows / WASD | velocity |
| Enter | confirm intent |
| Space | Safe confirm / release HOLD |
| Esc | STOP |
| ⌘Z / Ctrl+Z | UNDO |
| 1–4 | switch indices |

## Suite map

| Piece | Role | Notes |
|-------|------|--------|
| **NeuraBeach** | Catalog | https://neurabeach.com · `col-neura-suite` |
| **NeuraBinder** | End-user TCG + BCI Mode demo | https://neura-binder.vercel.app/demo |
| **NeuralBridge** | Intent middleware | `pileofflapjacks1/neuralbridge` |
| **Intent → OS** | OS cursor/keys | Beach `packages/intent-to-os` |
| **Neural Flow Architect** | Flow research | Separate |
| **NeuraShell** | Control plane / starter shell | This app |

Catalog listing source of truth: [`LISTING.md`](./LISTING.md) · machine form: [`neurabeach-manifest.json`](./neurabeach-manifest.json).

## Safety

- Computer-side only — generic intent streams / simulation.
- No medical claims; not SaMD; not “for implant patients only.”
- Not affiliated with Neuralink or any implant vendor.
- Agency: Pause / Stop / Undo first-class and reachable.

## Stack

Next.js App Router · TypeScript · Tailwind · Zustand · Vitest · Vercel-ready.

## License

MIT
