# Ship — NeuraShell MVP 0.4.0

**Status:** shipped  
**Date:** 2026-07-21  
**Tag intent:** `v0.4.0` / product freeze for MVP demos  

---

## Checklist

- [x] `pnpm test` green  
- [x] `pnpm build` green  
- [x] Live demo (no accounts / secrets): https://neurashell-eta.vercel.app/demo  
- [x] Shell home: https://neurashell-eta.vercel.app/  
- [x] Beach listing: https://neurabeach.com/projects/neurashell  
- [x] Suite collection: https://neurabeach.com/collections/col-neura-suite  
- [x] `neurabeach-manifest.json` + `LISTING.md` at 0.4.0  
- [x] `CHANGELOG.md` through 0.4.0  
- [x] Suite one-pager: [`docs/WHAT-IS-NEURASHELL.md`](./docs/WHAT-IS-NEURASHELL.md)  
- [x] Screenshots under `/public/screenshots/` (+ OG)  
- [x] Safety disclaimer on all pages  
- [x] No implant / medical / Neuralink affiliation claims  

---

## Smoke path (human)

1. Open `/demo` — tour runs without login  
2. Open `/` — Start synthetic → readiness rises → **ARM**  
3. Esc → freeze UI → Space/RELEASE  
4. `/calibrate` → save profile (local)  
5. Actuate OS → **Dry-run** — log shows move/click samples  
6. Optional local: `pnpm os:relay` then Live (after ARM)  

---

## Version lock

| Artifact | Version |
|----------|---------|
| `package.json` | `0.4.0` |
| `neurabeach-manifest.json` | `0.4.0` |
| `LISTING.md` | `0.4.0` |
| Beach seed (catalog) | keep in sync on Beach deploys |

**Do not bump** for cosmetic docs-only fixes unless you re-list on Beach.

---

## Suggested git tag

```bash
git tag -a v0.4.0 -m "NeuraShell MVP 0.4.0"
git push origin v0.4.0
```

---

## After ship (non-blocking)

- Real product stills / short Loom of `/demo` (optional)  
- Custom domain (optional)  
- Next features only when feedback demands them (undo timeline, Bridge health, harder OS path)
