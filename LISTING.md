# NeuraBeach listing copy (NeuraShell)

**Source of truth for catalog re-seed.** Keep in sync with NeuraBeach `seed-proj-neurashell` in collection `col-neura-suite`.

| Field | Value |
|-------|--------|
| **Slug** | `neurashell` |
| **Title** | NeuraShell |
| **Version** | `0.3.0` |
| **Category** | `accessibility` |
| **Featured** | yes |
| **Collection** | `col-neura-suite` |
| **Suite role** | `app` (control shell) |
| **Depends on** | `[]` (optional soft NeuralBridge later) |
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
| **outputs** | `ui_only` (v0.1; future `os_mouse` via adapter) |
| **hardware** | `synthetic`, `generic_intent`, `websocket_intent` |

---

## Short description (catalog card)

> Daily-driver computer-side control plane for high-bandwidth intent users: readiness score, ARM gate, mode switch, panic stop/undo, freeze UI, calibration, local intent record/replay, profiles. Simulator-first. Not implant software. Not a medical device. Not affiliated with Neuralink.

---

## Screenshots (public paths)

After deploy, prefer absolute live URLs. Repo placeholders:

1. `/screenshots/01-session.svg` — Session Ready + panic bar  
2. `/screenshots/02-modes.svg` — Mode switcher  
3. `/screenshots/03-demo.svg` — `/demo` tour  

Suggested live (post-deploy):

```
https://neurashell-eta.vercel.app/screenshots/01-session.svg
https://neurashell-eta.vercel.app/screenshots/02-modes.svg
https://neurashell-eta.vercel.app/screenshots/03-demo.svg
```

---

## Safety blurb (required)

Computer-side web app only. Not implant software. Not a medical device (not SaMD). Not affiliated with Neuralink or any implant vendor. Consumes **generic intent streams** and simulation only — never private implant APIs. Agency first-class: STOP / UNDO / HOLD. Local profiles only; no cloud neural data.

---

## Tags

`typescript` `nextjs` `accessibility` `control-plane` `intent-v1` `web` `neura-suite` `neurashell` `simulator` `panic-bar` `showcase`

---

## Suite map (do not rebuild)

| Piece | Role |
|-------|------|
| **NeuraBeach** | Catalog — https://neurabeach.com · `col-neura-suite` |
| **NeuraBinder** | End-user TCG + BCI Mode demo |
| **NeuralBridge** | Intent middleware |
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

In a **NeuraBeach-only** session: add `seed-proj-neurashell` to `col-neura-suite` from this LISTING + `neurabeach-manifest.json` (same pattern as Binder / NFA). Update live demo URL if the Vercel hostname differs.
