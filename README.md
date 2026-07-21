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
- A11y scorecard: [http://localhost:3000/a11y](http://localhost:3000/a11y)

```bash
pnpm build
pnpm test
```

No accounts. No env secrets for v0.1 demo.

## What ships in v0.1

| Area | Behavior |
|------|----------|
| **Session Ready** | disconnected / synthetic / bridge-sim / bridge-remote labels; one-click synthetic; confidence meter; Safe mode |
| **Modes** | exactly one of `point` · `click` · `type` · `switch` · `idle` (Safe mode requires confirm) |
| **Panic bar** | STOP · UNDO · HOLD — sticky, large targets; Esc / ⌘Z / Space |
| **Profiles** | localStorage + export/import JSON (NeuralBridge-friendly fields) |
| **Intents** | synthetic walk, keyboard sim, optional Bridge WS `ws://127.0.0.1:7711` / BroadcastChannel |
| **Demo** | `/demo` ~60s scripted tour, keyboard-complete |

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
