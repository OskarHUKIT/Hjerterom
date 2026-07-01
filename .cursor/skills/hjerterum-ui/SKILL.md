---
name: hjerterum-ui
description: Build or review Hjerterum/Boly UI — universal Boly Standard on all pages, dark/light theme everywhere, Norwegian/Sámi/English, no white-screen modules. Use for frontend UI, styles, or UX review.
---

# Hjerterum UI Skill

## Product rules (locked)

1. **Every page feels like Boly** — dark professional default, not simplistic white screens
2. **Dark + light mode** on all routes (Finn, Los, guests included)
3. **Three languages everywhere:** Norwegian (`no`), Sámi (`se`), English (`en`)
4. **Locale `se` = Sámi** — never Swedish

Read: `docs/hjerterum/PRD.md` §15, `docs/hjerterum/DESIGN_SYSTEM.md`

## Styling

```css
/* CORRECT — uses globals tokens, works in dark and light */
.card { background: var(--bg-card); color: var(--text-body); }

/* WRONG — white-screen new feature */
.page { background: #ffffff; }
```

- Primary CSS: `frontend/app/globals.css`
- Brand layer: `hjerterum-v2.css`
- **Do not** create always-light-only CSS for new features
- `finn.css` / `los.css` are legacy — new work uses globals + `[data-theme]`

## Theme

- Default: `document.documentElement.setAttribute('data-theme', 'dark')`
- Toggle must work for guests (localStorage) — extend `ThemeContext` if needed
- Test **both** themes before PR

## i18n

```typescript
import { useLanguage } from '@/context/LanguageContext'
const { t } = useLanguage()
// t('myKey') — add myKey to no, se, AND en in lib/i18n/*
```

Language selector pattern: see `Header.tsx` (`no`, `se`, `en` options).

## Components

```typescript
import { useToast, useConfirm, PageSkeleton, EmptyState } from '@/app/components/design-system'
```

## Checklist

- [ ] Not a white/light-only new screen
- [ ] Dark + light both work
- [ ] no + se + en strings for new copy
- [ ] Theme + language controls on shell
- [ ] PageSkeleton / EmptyState for async views
- [ ] 320px + keyboard a11y

## Migration note

Finn/Los currently violate PRD (always-light `finn.css`/`los.css`). New PRs must **not** extend that pattern — align with globals.css. See PRD §15.8.
