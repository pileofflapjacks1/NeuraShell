# Ship — NeuraShell

**Current:** 0.6.0 undo timeline · 2026-10-04  
**Previous:** 0.5.1 Bridge health · 2026-10-04  

## 0.6.0

- [x] `pnpm test` green
- [x] `pnpm build` green
- [x] `CHANGELOG.md` 0.6.0
- [x] `package.json`, `LISTING.md`, `neurabeach-manifest.json` at 0.6.0
- [x] Beach catalog part + override copy at 0.6.0
- [x] Undo timeline: newest first, one pop, empty copy, STOP/HOLD stay reachable
- [x] ARM, OS live, and Bridge link changes stay off the undo stack
- [x] Bridge health unchanged (connecting / open / lost, backoff, HOLD + dry-run on loss while armed)

Tag when you want it:

```bash
git tag -a v0.6.0 -m "NeuraShell 0.6.0 undo timeline"
git push origin v0.6.0
```

---

## 0.5.1

- [x] `pnpm test` green
- [x] `pnpm build` green
- [x] `CHANGELOG.md` 0.5.1
- [x] `package.json`, `LISTING.md`, `neurabeach-manifest.json` at 0.5.1
- [x] Beach catalog part moved off the stale 0.4.0 card

Tag when you want it:

```bash
git tag -a v0.5.1 -m "NeuraShell 0.5.1 Bridge health"
git push origin v0.5.1
```

---

# Ship — NeuraShell 0.5.0

**Status:** gym + hard ARM gate  
**Date:** 2026-09-03  
**Tag intent:** `v0.5.0`  

---

## Checklist

- [x] `pnpm test` green  
- [x] `pnpm build` green  
- [x] Live demo (no accounts / secrets): https://neurashell-eta.vercel.app/demo  
- [x] Shell home: https://neurashell-eta.vercel.app/  
- [x] Beach listing: https://neurabeach.com/projects/neurashell  
- [x] Suite collection: https://neurabeach.com/collections/col-neura-suite  
- [x] `neurabeach-manifest.json` + `LISTING.md` at 0.5.0  
- [x] `CHANGELOG.md` through 0.5.0  
- [x] Suite one-pager: [`docs/WHAT-IS-NEURASHELL.md`](./docs/WHAT-IS-NEURASHELL.md)  
- [x] Screenshots under `/public/screenshots/` (+ OG)  
- [x] Safety disclaimer on all pages  
- [x] No implant / medical / Neuralink affiliation claims  
- [x] Fresh profile cannot ARM; gym accept unlocks ARM  
- [x] Live OS refuses without ARM + Safe confirm + gym mapping; STOP → dry-run  

---

## Smoke path (human)

1. Open `/demo` — tour runs without login  
2. Open `/` — Start synthetic → **ARM blocked** until gym  
3. `/gym` — slice trials → accept remap if offered → back to shell → **ARM**  
4. Esc → freeze UI → Space/RELEASE  
5. `/calibrate` → save profile (local) → continue to gym  
6. Actuate OS → **Dry-run** — log shows mapping that would fire (`click←…`)  
7. Optional local: `pnpm os:relay` then Live (after ARM + Safe confirm + gym)  

---

## Version lock

| Artifact | Version |
|----------|---------|
| `package.json` | `0.6.0` |
| `neurabeach-manifest.json` | `0.6.0` |
| `LISTING.md` | `0.6.0` |
| Beach catalog part | `0.6.0` |
| Beach seed (catalog) | keep in sync on Beach deploys |

**Do not bump** for cosmetic docs-only fixes unless you re-list on Beach.

---

## Suggested git tag

```bash
git tag -a v0.5.0 -m "NeuraShell 0.5.0 gym + hard ARM gate"
git push origin v0.5.0
```

---

## After ship (non-blocking)

- Real product stills / short Loom of `/demo` (optional)  
- Custom domain (optional)  
- Bridge health shipped in 0.5.1
- Undo timeline shipped in 0.6.0
- Next features only when feedback demands them (harder OS path, PWA, custom domain)
