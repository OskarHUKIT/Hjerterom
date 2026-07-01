# M6 — Always-light cleanup (PRD §15.8 M6)

**Status:** Ready  
**Prefix:** `chore(prd-m6):`  
**Depends:** M3–M5

## Goal

Grep-clean: remove "always light" comments, `data-finn-shell` hacks, forced white backgrounds.

## Verify

```bash
rg -i "always light|always-light|data-finn-shell" frontend/
# expect 0 matches
```
