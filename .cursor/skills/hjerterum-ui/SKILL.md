---
name: hjerterum-ui
description: Build/review Hjerterum UI to Boly standard — dark default on all pages (Finn/Los included), dark/light toggle with session persistence when logged in, Norwegian/Sámi/English only with Sámi on every string.
---

# Hjerterum UI Skill

## Locked product rules

1. **Boly (B-O-L-Y) look** on every page — dark default, no white-screen modules
2. **Dark default** on Finn, Los, and all new features
3. **Theme:** user picks dark/light; **logged in** = persists across sessions; guest = localStorage
4. **Languages:** Norwegian (`no`), Sámi (`se`), English (`en`) **only**
5. **Sámi on everything** — every user-facing key must have `se`; no ship without it
6. Swedish/Danish: **do not add**

Read: `docs/hjerterum/PRD.md` §15.11 (locked decisions)

## Theme

```typescript
// Logged in: sync profiles.preferred_theme + localStorage boly-theme:{userId}
// Guest: localStorage boly-theme-guest
// Default: data-theme="dark" always
```

## i18n

```typescript
// Every new key in lib/i18n — all three:
// no: { myKey: '...' }
// se: { myKey: '...' }  // Sámi — required
// en: { myKey: '...' }
```

## PR checklist

- [ ] Dark default (not white first paint)
- [ ] Dark + light both work
- [ ] `no` + `se` + `en` for all new copy
- [ ] No Swedish/Danish
- [ ] Finn/Los use globals.css tokens, not light-only CSS

Migration: PRD §15.8 M1–M5
