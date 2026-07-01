# Hjerterum / Boly — Design System Reference

**Version:** 1.0 · July 2026  
**Status:** Canonical companion to `PRD.md` §15  
**Audience:** Engineers, designers, agents, reviewers

This document is the **single source of truth** for visual and interaction patterns. When code and this doc disagree, fix the code or update this doc in the same PR.

---

## 1. Design philosophy

| Principle | Meaning |
|-----------|---------|
| **Trust first** | Municipal caseworkers and landlords handle sensitive housing decisions. UI must feel calm, professional, and predictable — never playful at the expense of clarity. |
| **Boly App Standard** | Production `/homeowner` + `/nav` UX is the baseline. Hjerterum adds lanes; it does not reinvent navigation or data density. |
| **Four planes, one system** | Marketing, Boly App, Finn, Los, and Ops share tokens and lane semantics but may differ in theme (dark vs light). |
| **Mobile-first** | Many landlords and some caseworkers work from phones. Design 320px up. |
| **Accessible by default** | WCAG 2.1 AA is a ship gate, not a backlog item. |

**Benchmarks (aspirational, not copy-paste):**
- **Boly App / Nav:** gov.uk form clarity + Stripe-level data tables
- **Finn:** Airbnb booking flow simplicity (without their visual clone)
- **Ops:** Stripe Dashboard information density
- **Los:** Low-friction chat apps (iMessage/WhatsApp patterns, not social media)

---

## 2. Visual planes

```
hjerterum.no / landing     →  hjerterum-v2.css + globals.css (dark/light)
app.* /homeowner, /nav     →  globals.css (+ phased hjerterum-v2.css)
finn.* /finn/*             →  finn/finn.css (always light)
los.* /los/*               →  los/los.css (always light)
ops.* /ops/*               →  ops/ops.css (dark admin)
```

**Cross-plane rules:**
- Lane calendar colours are **shared** (`--lane-sosial-*`, `--lane-tourism-*`, `--lane-event-*`, `--lane-conflict-*`).
- Never import `finn.css` or `los.css` into app routes.
- Portal-specific copy and layout may differ; **feedback patterns** (toast, confirm, skeleton) must not.

---

## 3. Tokens

### 3.1 Core palette (Boly App — `globals.css`)

| Token | Dark | Purpose |
|-------|------|---------|
| `--bg-app` | `#020617` | Page background |
| `--bg-card` | `#0f172a` | Cards, panels |
| `--text-main` | `#f8fafc` | Headings, emphasis |
| `--text-body` | `#cbd5e1` | Body copy |
| `--text-muted` | `#94a3b8` | Secondary labels |
| `--color-accent` | `--color-sky-blue` | Links, focus accents |
| `--color-royal-blue` | `#3b82f6` | Primary actions |
| `--color-teal` | `#2dd4bf` | Success, social lane accent |

### 3.2 Hjerterum v2 brand (`hjerterum-v2.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--hrt-primary` | `#5b7cfa` | Brand accent (overrides `--color-accent` where loaded) |
| `--hrt-warm` | `#f97316` | Warm highlights |
| `--hrt-heart` | `#e879a9` | Brand gradient accent |
| `--hrt-teal` | `#2dd4bf` | Aligns with social lane |
| `--hrt-radius-lg/md/sm` | 20/14/10px | Marketing cards, modals |

### 3.3 Spacing (8px grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 16px |
| `--space-4` | 24px |
| `--space-5` | 32px |
| `--space-6` | 48px |

Use tokens in CSS. In TSX, prefer class names over inline spacing.

### 3.4 Breakpoints

| Token | Value |
|-------|-------|
| `--bp-sm` | 480px |
| `--bp-md` | 768px |
| `--bp-lg` | 1024px |
| `--bp-xl` | 1280px |

### 3.5 Typography

| Role | Font | CSS |
|------|------|-----|
| Body | DM Sans | `--font-body` |
| Display / hero | Fraunces | `--font-display` |
| Page H1 | fluid | `var(--fluid-h1-page)` |
| Hero H1 | fluid | `var(--fluid-h1-hero)` |

**Rules:**
- Fraunces only on landing, login hero, Los header — not in dense data tables.
- Minimum 16px input font on mobile (prevents iOS zoom).

### 3.6 Lane semantics (calendars)

| Lane | Accent token | Meaning |
|------|--------------|---------|
| Sosial | `--lane-sosial-accent` (teal) | Municipal mediation |
| Turisme | `--lane-tourism-accent` (amber) | Short-stay bookings |
| Event | `--lane-event-accent` (purple) | Central events |
| Conflict | `--lane-conflict-bg` (red) | Overlapping holds |

Implementation: `frontend/features/listings/lib/laneCalendarStyles.ts` + CSS variables.

### 3.7 Motion

| Token | Value |
|-------|-------|
| `--transition-fast` | 0.2s |
| `--transition-smooth` | 0.25s |
| `--ease-out-soft` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |

Always provide `@media (prefers-reduced-motion: reduce)` fallbacks.

---

## 4. Global CSS classes

Prefer these over bespoke styles:

| Class | Use |
|-------|-----|
| `.container` | Max-width page wrapper |
| `.card` | Elevated content panel |
| `.button` | Secondary / outline actions |
| `.button-accent` | Primary CTA |
| `.input` | Text fields, selects |
| `.label` | Form labels |

See `globals.css` for modifiers (sizes, full-width, danger). **Do not duplicate button styles in feature CSS.**

---

## 5. Component catalogue

### 5.1 Design-system (`app/components/design-system/`)

| Component | When to use |
|-----------|-------------|
| `Toast` / `useToast` | Success, error, info after actions |
| `ConfirmDialog` / `useConfirm` | Delete, irreversible actions |
| `PageSkeleton` | Initial page load |
| `EmptyState` | Zero results with next step |
| `Modal` | Focus-trapped overlays |
| `FieldInput` | Auth and form fields with labels |
| `PortalCard` | Landing portal selection |
| `SkipLink` | Skip to main content |
| `PortalPageShell` | Marketing/portal page wrapper |

### 5.2 UI primitives (`app/components/ui/`)

| Component | When to use |
|-----------|-------------|
| `Button` | Thin wrapper when variant prop needed |

### 5.3 Ops reference (`app/ops/components/`)

Use for data-dense patterns: `OpsShell`, `OpsPanel`, `OpsDataTable`, `OpsBadge`, `OpsAlert`, `OpsKpiGrid`, `OpsMobileNav`.

If an ops pattern is needed in `/nav` or `/homeowner`, **extract** to design-system rather than copying CSS.

### 5.4 App chrome

| Component | Role |
|-----------|------|
| `SiteChrome` | Header + footer wrapper |
| `MobileBottomNav` | Mobile primary nav |
| `BottomSheet` | Mobile actions |

---

## 6. Interaction patterns

### 6.1 Loading

```
User navigates → PageSkeleton (or route-level loading.tsx)
Data refetch   → Inline spinner or skeleton rows — never freeze UI
Mutation       → Disable button + show pending state on button
```

### 6.2 Errors

```
API error     → Toast with actionable message (i18n key)
Form error    → Inline field error + aria-describedby
Fatal error   → EmptyState or error boundary with retry
```

### 6.3 Confirmations

```
Destructive   → useConfirm() with clear verb ("Slett", "Avbryt formidling")
Reversible    → Toast with undo if feasible (future)
```

### 6.4 Tables (mobile)

Wrap in `overflow-x: auto` with `-webkit-overflow-scrolling: touch`. Set sensible `min-width` on table. **Do not** squash columns below readability.

### 6.5 Messaging

Use shared chat components from `features/messaging/` (`ChatComposer`, `ChatMessageBubble`). Channel label must show counterparty type (social / event / guest).

---

## 7. i18n

- Keys live in `frontend/lib/i18n/{common,listings,nav,finn,ops}.ts`
- Finn default language: **EN** (locked product decision)
- Main app default: **NO**
- No new user-facing literals in TSX — add keys to appropriate namespace

---

## 8. Theming

| Surface | Mechanism |
|---------|-----------|
| Boly App | `data-theme="dark"|"light"` on `<html>` via `ThemeContext` |
| Finn / Los | Always light — no toggle |
| Ops | Follows `data-theme` but uses `--ops-*` scoped tokens |

---

## 9. Tailwind usage

`tailwind.config.js` has **preflight disabled**. Tailwind is additive only.

- Use `boly-*` colour utilities mapped from tokens when using Tailwind
- Do not introduce arbitrary values (`bg-[#abc]`) — use CSS variables
- New features: prefer global classes + tokens unless grid/flex utility clearly helps

---

## 10. File map

| File | Contents |
|------|----------|
| `frontend/app/globals.css` | Boly App tokens + global components |
| `frontend/app/styles/hjerterum-v2.css` | Brand refresh layer |
| `frontend/app/finn/finn.css` | Tourism plane |
| `frontend/app/los/los.css` | Digital Los plane |
| `frontend/app/ops/ops.css` | Ops admin plane |
| `frontend/tailwind.config.js` | Token-mapped utilities |

---

## 11. Adding new patterns

1. Check if existing component/class fits.
2. If new: use tokens only; add to this doc.
3. If reused twice: promote to `design-system/`.
4. Update `PRD.md` §15 if user-facing requirement changes.

---

*Maintained alongside `UI_UX_GOVERNANCE.md` and `.cursor/skills/hjerterum-ui/SKILL.md`.*
