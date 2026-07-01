# Hjerterum / Boly — Design System Reference

**Version:** 1.2 · July 2026  
**Status:** Canonical companion to `PRD.md` §15  
**Audience:** Engineers, designers, agents, reviewers

This document is the **single source of truth** for visual and interaction patterns. When code and this doc disagree, fix the code or update this doc in the same PR.

---

## 1. Design philosophy

| Principle | Meaning |
|-----------|---------|
| **Trust first** | Municipal caseworkers and landlords handle sensitive housing decisions. UI must feel calm, professional, and predictable. |
| **Universal Boly Standard** | Production `/homeowner` + `/nav` UX applies to **every page** — Finn, Los, Ops, landing, and all new features. |
| **Dark default, light optional** | First paint is dark (`--bg-app: #020617`). Users toggle light mode everywhere — no always-light modules. |
| **No white-screen modules** | New features must not ship as flat white pages with a separate CSS skin. |
| **Trilingual** | Norwegian, Sámi (`se`), English **only** — Sámi on every string; Swedish/Danish out of scope. |
| **Mobile-first** | Design 320px up. |
| **Accessible by default** | WCAG 2.1 AA in **both** dark and light themes. |

---

## 2. One visual system, module contexts

All routes share `globals.css` tokens and `[data-theme]`. Module contexts differ in **layout and IA**, not in fundamental look-and-feel.

```
ALL ROUTES  →  globals.css + hjerterum-v2.css (brand layer)
               [data-theme="dark"|"light"] on <html>
               LanguageContext: no | se (Sámi) | en

/homeowner, /nav     →  reference Boly implementation
/finn/*              →  same tokens; search/booking layout (migrate off finn.css light-only)
/los/*               →  same tokens; chat-first layout (migrate off los.css light-only)
/ops/*               →  ops.css extends tokens for data density
/ landing            →  portal cards, hero
```

**Retired:** "Finn = always light" and "Los = always light" — see PRD §15.8 migration.

**Cross-context rules:**
- Lane calendar colours are **shared** (`--lane-*`).
- Toast, confirm, skeleton, empty state patterns are **shared**.
- Theme toggle and language selector on **every** shell.
- Do not create new `*-only-light.css` files.

---

## 3. Tokens

### 3.1 Core palette (`globals.css`)

| Token | Dark | Purpose |
|-------|------|---------|
| `--bg-app` | `#020617` | Page background — **default for all modules** |
| `--bg-card` | `#0f172a` | Cards, panels |
| `--text-main` | `#f8fafc` | Headings |
| `--text-body` | `#cbd5e1` | Body copy |
| `--text-muted` | `#94a3b8` | Secondary labels |
| `--color-accent` | `--color-sky-blue` | Links, focus |
| `--color-royal-blue` | `#3b82f6` | Primary actions |
| `--color-teal` | `#2dd4bf` | Success, social lane |

Light mode overrides: `[data-theme='light']` block in `globals.css`.

### 3.2 Hjerterum v2 brand (`hjerterum-v2.css`)

Accent and marketing polish — does not replace dark/light infrastructure.

### 3.3 Spacing, breakpoints, typography, lane, motion

Unchanged from v1.0 — see tokens in `globals.css`.

---

## 4. Theme (all pages)

| Rule | Detail |
|------|--------|
| Default | **Dark** on Finn, Los, app, ops, landing — no exceptions |
| Toggle | Dark / light on every surface |
| Logged in | `profiles.preferred_theme` + per-user localStorage — survives sessions |
| Guest | `localStorage` — survives reloads on same device |
| Forbidden | Always-light module CSS (`finn.css` / `los.css` legacy) |

---

## 5. Languages (all pages)

**Supported:** `no` (Norwegian), `se` (Sámi / Sámegiella), `en` (English) **only**.

- **Sámi on everything** — every user-facing key must exist in `se`; ship gate
- Swedish (`sv`), Danish (`da`), and other locales: **not in scope**
- Locale `se` is Sámi — never label as Swedish
- Logged-in: `profiles.preferred_locale` + `boly-locale` localStorage

---

## 6. Global CSS classes

`.container`, `.card`, `.button`, `.button-accent`, `.input`, `.label` — use on all modules including Finn and Los after migration.

---

## 7. Component catalogue

Design-system → Ops components → feature components → global classes → new (promote if reused).

---

## 8. Anti-patterns

| Do not | Do instead |
|--------|------------|
| White full-page new feature screens | `globals.css` dark default + cards |
| `finn.css`-style light-only gradients | Token-based `[data-theme]` styling |
| Single-language hard-coded copy | `t('key')` in all three locales |
| Theme toggle only when logged in | localStorage theme for guests |

---

## 9. File map

| File | Role |
|------|------|
| `globals.css` | **Primary** — all modules |
| `hjerterum-v2.css` | Brand accent layer |
| `finn/finn.css` | **Legacy** — migrate to globals (PRD §15.8) |
| `los/los.css` | **Legacy** — migrate to globals (PRD §15.8) |
| `ops/ops.css` | Ops density extensions on top of tokens |

---

*Maintained alongside `UI_UX_GOVERNANCE.md` and `.cursor/skills/hjerterum-ui/SKILL.md`.*
