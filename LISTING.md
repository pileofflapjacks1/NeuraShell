# NeuraBeach listing copy (NeuraShell)

**Source of truth for catalog re-seed.** Keep in sync with NeuraBeach `seed-proj-neurashell` in collection `col-neura-suite`.

| Field | Value |
|-------|--------|
| **Slug** | `neurashell` |
| **Title** | NeuraShell |
| **Version** | `0.5.0` |
| **Category** | `accessibility` |
| **Featured** | yes |
| **Collection** | `col-neura-suite` |
| **Suite role** | `app` (control shell) |
| **Depends on** | `[]` (optional soft Neurabridge later) |
| **License** | MIT |
| **GitHub** | https://github.com/pileofflapjacks1/NeuraShell |
| **Live demo** | https://neurashell-eta.vercel.app/demo |
| **A11y** | https://neurashell-eta.vercel.app/a11y |
| **Entrypoint** | same as live demo `/demo` |
| **Manifest** | `neurabeach-manifest.json` in repo root |
| **safety_class** | `computer_side` |
| **runtime** | `web` |
| **adapter_maturity** | `open_stack` |
| **banned_claims** | `true` |
| **permissions** | `none` |
| **inputs** | `velocity_2d`, `class_label`, `switch_binary`, `synthetic` |
| **outputs** | `ui_only`, `os_mouse` (dry-run default; live = local POST only) |
| **hardware** | `synthetic`, `generic_intent`, `websocket_intent` |

---

## Short description (catalog card)

> Daily-driver computer-side control plane: readiness, ARM gate, freeze UI, calibration, record/replay, Actuate OS dry-run (optional live local POST to Intent→OS-style endpoint). Simulator-first. Not implant software. Not a medical device. Not affiliated with Neuralink.

---

## Screenshots (public absolute URLs)

```
https://neurashell-eta.vercel.app/screenshots/01-session.svg
https://neurashell-eta.vercel.app/screenshots/02-modes.svg
https://neurashell-eta.vercel.app/screenshots/03-demo.svg
https://neurashell-eta.vercel.app/screenshots/04-actuate.svg
https://neurashell-eta.vercel.app/og.svg
```

| Asset | Content |
|-------|---------|
| `01-session` | Session Ready + readiness + ARM + panic bar |
| `02-modes` | Mode switcher + freeze UI |
| `03-demo` | `/demo` tour path |
| `04-actuate` | Actuate OS dry-run log |
| `og.svg` | Open Graph / social card |

Suite one-pager (repo): [`docs/WHAT-IS-NEURASHELL.md`](./docs/WHAT-IS-NEURASHELL.md)

---

## Safety blurb (required)

Computer-side web app only. Not implant software. Not a medical device (not SaMD). Not affiliated with Neuralink or any implant vendor. Consumes **generic intent streams** and simulation only — never private implant APIs. Agency first-class: STOP / UNDO / HOLD. Local profiles only; no cloud neural data.

---

## Tags

`typescript` `nextjs` `accessibility` `control-plane` `intent-v1` `web` `neura-suite` `neurashell` `simulator` `panic-bar` `showcase` `mvp` `readiness` `record-replay`

---

## Suite map (do not rebuild)

| Piece | Role |
|-------|------|
| **NeuraBeach** | Catalog — https://neurabeach.com · `col-neura-suite` |
| **NeuraBinder** | End-user TCG + BCI Mode demo |
| **Neurabridge** | Intent middleware |
| **Intent → OS** | OS cursor/keys from velocity |
| **Neural Flow Architect** | Flow co-pilot research |
| **NeuraShell (this)** | Daily-driver control plane / starter shell |

North star: *Beach finds tools · Binder is the live demo · Bridge is how apps share intents · **Shell is how you stay safely in control all day.***

---

## Install (local)

```bash
pnpm install
pnpm dev
# open http://localhost:3000  and  /demo
```

No env secrets required for demo mode.

---

## Manifest highlights

```json
{
  "suite_role": "app",
  "depends_on": [],
  "entrypoint": "https://neurashell-eta.vercel.app/demo",
  "safety_class": "computer_side",
  "runtime": "web",
  "banned_claims": true
}
```

---

## Beach re-seed note

**Already seeded** as `seed-proj-neurashell` in `col-neura-suite` (live). On catalog updates, sync Beach seed from this LISTING + `neurabeach-manifest.json` (version, screenshots, short description). Live demo hostname: `neurashell-eta.vercel.app`.
