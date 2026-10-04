# What NeuraShell is (and is not)

One-page suite copy for Beach, demos, and collaborators.  
**Version:** 0.5.1 · **Role:** `suite_role: app` (control shell)

---

## One-liner

> Daily-driver **computer-side control plane** for high-bandwidth intent users: gym slice, hard ARM gate, modes, panic stop/undo, calibration, profiles, record/replay, Actuate OS dry-run. Simulator-first.

---

## It is

| | |
|--|--|
| **A control plane** | Modes, panic, gym, hard ARM gate, local profiles — so apps don’t reimplement safety |
| **Computer-side software** | Runs in the browser; consumes **generic intent streams** / simulation |
| **Simulator-first** | Keyboard + synthetic work with zero hardware |
| **Agency-first** | STOP / UNDO / HOLD always reachable; freeze UI; STOP disarms and kills live OS |
| **Suite-native** | Listed on NeuraBeach (`col-neura-suite`); soft Bridge; Intent→OS sample format |
| **Local-first** | Profiles and recordings stay in the browser / local files — no cloud neural data |

```
User
  ↓ NeuraShell   ← modes, panic, readiness, ARM, profiles
  ↓ Neurabridge (optional middleware)
  ↓ Intent → OS / apps (Binder, etc.)
```

North star: *Beach finds tools · Binder is the live demo · Bridge is how apps share intents · **Shell is how you stay safely in control all day.***

---

## It is not

| | |
|--|--|
| **Not implant software** | No Neuralink / vendor implant SDKs or private implant APIs |
| **Not a medical device** | Not SaMD; no diagnose / treat / cure / prevent claims |
| **Not affiliated with Neuralink** | Or any implant vendor |
| **Not NeuraBinder** | Binder = TCG + BCI Mode demo app |
| **Not Neurabridge** | Bridge = intent middleware library / service |
| **Not Neural Flow Architect** | NFA = flow co-pilot research |
| **Not NeuraBeach** | Beach = catalog / storefront |
| **Not full OS takeover by default** | In-shell preview; Actuate OS is **dry-run** unless you opt into local live POST + a local helper |

---

## Try it

| | URL |
|--|-----|
| Demo tour | https://neurashell-eta.vercel.app/demo |
| Full shell | https://neurashell-eta.vercel.app/ |
| Calibrate | https://neurashell-eta.vercel.app/calibrate |
| Gym | https://neurashell-eta.vercel.app/gym |
| Beach card | https://neurabeach.com/projects/neurashell |
| Source | https://github.com/pileofflapjacks1/NeuraShell |

```bash
pnpm install && pnpm dev   # http://localhost:3000
pnpm test && pnpm build
```

No accounts. No env secrets for the demo.

---

## Scope lock (0.5.1)

**In:** gym slice + remap-on-accept, hard ARM gate (no score bypass), freeze, calibrate, profiles v0.3 mappings, record/replay, OS dry-run (live = ARM + Safe + gym mapping), soft Bridge health (connecting / open / lost; loss while armed HOLDs and drops live OS), Beach listing.  
**Out (for later):** undo timeline UI, PWA, custom domain, hard Bridge package, full desktop driver in-browser.

---

## Safety blurb (paste anywhere)

Computer-side web app only. Not implant software. Not a medical device. Not affiliated with Neuralink or any implant vendor. Generic intent streams and simulation only. Agency first-class: STOP / UNDO / HOLD. Local profiles only.
