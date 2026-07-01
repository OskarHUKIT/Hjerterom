---
name: hjerterum-ui
description: Build or review Hjerterum/Boly UI to the Boly App Standard — tokens, visual planes, design-system components, accessibility, and mobile patterns. Use when creating or modifying frontend components, styles, layouts, or reviewing UI PRs.
---

# Hjerterum UI Skill

Apply when working on `frontend/` UI — components, pages, styles, or UX review.

## Quick context

- **Boly App Standard** = production `/homeowner` + `/nav` UX (`globals.css`)
- **Hjerterum** = multi-lane expansion; same interaction patterns, phased brand (`hjerterum-v2.css`)
- **Four planes:** Boly App (dark), Finn (light), Los (light), Ops (dark admin)

Read before implementing:
1. `docs/hjerterum/DESIGN_SYSTEM.md` — tokens, components, file map
2. `docs/hjerterum/PRD.md` §15 — requirements and honest gaps
3. `docs/hjerterum/UI_UX_GOVERNANCE.md` — PR checklist

## Implementation workflow

### 1. Identify the visual plane

```
Route prefix          →  CSS file
/homeowner, /nav      →  globals.css (never finn.css/los.css)
/finn                 →  finn/finn.css
/los                  →  los/los.css
/ops                  →  ops/ops.css
/ (landing)           →  globals.css + hjerterum-v2.css
```

### 2. Check existing components

```typescript
// Prefer these imports
import { useToast, useConfirm, PageSkeleton, EmptyState, Modal, FieldInput } from '@/app/components/design-system'
```

Search `app/components/design-system/` and `features/*/components/` before creating new UI.

### 3. Styling rules

- Use global classes: `.button`, `.button-accent`, `.card`, `.input`
- Use CSS variables for colours and spacing — never hard-code hex in TSX
- Lane calendars: import from `features/listings/lib/laneCalendarStyles.ts`
- Fraunces font only for hero/display — not data tables

### 4. Interaction rules

| Do | Don't |
|----|-------|
| `useToast()` for feedback | `alert()` |
| `useConfirm()` for destructive actions | `confirm()` |
| `PageSkeleton` while loading | Blank white screen |
| `EmptyState` for zero results | Empty div |
| i18n keys in `lib/i18n/*` | Hard-coded Norwegian strings |

### 5. Mobile & a11y

- Min touch target: 44×44px (`--touch-target`)
- Input font ≥16px on mobile
- Tables: wrap in scroll container
- `env(safe-area-inset-*)` on fixed header/footer/nav
- `:focus-visible` for keyboard users
- Test at 320px width

### 6. Verify

```bash
cd frontend && npm run lint
# If e2e available:
npm run test:e2e
```

Manual: 320px + 1280px on changed flow; light/dark if Boly App.

## Review checklist (for PR review)

- [ ] Correct visual plane, no CSS cross-imports
- [ ] Design-system components used
- [ ] No alert/confirm/inline brand hex
- [ ] i18n for new strings
- [ ] Loading + empty states present
- [ ] Mobile + keyboard accessible

## Anti-patterns to flag

```tsx
// BAD
window.confirm('Slette?')
style={{ backgroundColor: '#5b7cfa' }}
<p>Velg bolig</p>  // hard-coded NO

// GOOD
const confirmed = await confirm({ title: t('delete.title'), ... })
className="button-accent"
<p>{t('listings.select')}</p>
```

## Escalation

- New colour outside tokens → update `DESIGN_SYSTEM.md` + PRD §15
- New shared pattern used twice → add to `design-system/`
- Plane merge (e.g. Finn styles in nav) → reject; requires product decision

## Reference files

| File | Purpose |
|------|---------|
| `frontend/app/globals.css` | Boly tokens + global components |
| `frontend/app/styles/hjerterum-v2.css` | Brand layer |
| `frontend/app/components/design-system/` | Shared UI |
| `frontend/app/ops/components/` | Admin reference patterns |
| `frontend/features/listings/lib/laneCalendarStyles.ts` | Lane colours |
