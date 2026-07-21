# NeuraShell

**MVP 0.4.0** — computer-side **control plane** for high-bandwidth *intent* users.

Simulator-first. **Not** implant software. **Not** a Neuralink product. **Not** a medical device.

```
User
  ↓ NeuraShell  ← modes, panic, readiness, ARM, profiles
  ↓ NeuralBridge (optional middleware)
  ↓ Intent → OS / apps (Binder, etc.)
```

**Suite one-pager:** [`docs/WHAT-IS-NEURASHELL.md`](./docs/WHAT-IS-NEURASHELL.md) · **Ship status:** [`SHIP.md`](./SHIP.md) · **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

## Live

| | |
|--|--|
| **Demo tour** | https://neurashell-eta.vercel.app/demo |
| **Shell** | https://neurashell-eta.vercel.app/ |
| **Calibrate** | https://neurashell-eta.vercel.app/calibrate |
| **Beach listing** | https://neurabeach.com/projects/neurashell |
| **Suite collection** | https://neurabeach.com/collections/col-neura-suite |
| **GitHub** | https://github.com/pileofflapjacks1/NeuraShell |

## Quick start

```bash
pnpm install
pnpm dev
```

| Route | Purpose |
|-------|---------|
| `/` | Full shell |
| `/demo` | Scripted tour (no account) |
| `/calibrate` | Dwell / threshold / Safe wizard |
| `/a11y` | Accessibility scorecard |
| `/settings` | Advanced profile |

```bash
pnpm test
pnpm build
```

No accounts. No env secrets for the demo.

## What ships (MVP 0.4)

| Area | Behavior |
|------|----------|
| **Session Ready** | Readiness score 0–100 + factor checklist |
| **ARM gate** | Intent actuation only when ARMED; STOP disarms |
| **Modes** | `point` · `click` · `type` · `switch` · `idle` |
| **Panic + freeze** | STOP · UNDO · HOLD; freeze overlay |
| **Calibration** | `/calibrate` → local profile |
| **Record / Replay** | Local JSON capture + timeline replay |
| **Actuate OS** | Dry-run preview; optional live local POST |
| **Catalog** | Beach `col-neura-suite` · `LISTING.md` · manifest |

### Actuate OS (dry-run first)

```bash
pnpm os:relay   # optional: http://127.0.0.1:8765/intent
pnpm dev        # Dry-run log · Live needs ARM + Safe confirm
```

Browser cannot move the system mouse alone. Pair live posts with [Intent → OS](https://github.com/pileofflapjacks1/neurabeach/tree/main/packages/intent-to-os) or the relay NDJSON.

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

| Piece | Role |
|-------|------|
| **NeuraBeach** | Catalog — https://neurabeach.com |
| **NeuraBinder** | End-user TCG + BCI Mode demo |
| **NeuralBridge** | Intent middleware |
| **Intent → OS** | OS cursor/keys from velocity |
| **Neural Flow Architect** | Flow research |
| **NeuraShell** | **This app** — daily-driver control plane |

Catalog source of truth: [`LISTING.md`](./LISTING.md) · [`neurabeach-manifest.json`](./neurabeach-manifest.json).

## Safety

- Computer-side only — generic intent streams / simulation  
- No medical claims; not SaMD  
- Not affiliated with Neuralink or any implant vendor  
- Agency: STOP / UNDO / HOLD first-class  

## Stack

Next.js App Router · TypeScript · Tailwind · Zustand · Vitest · Vercel

## License

MIT
