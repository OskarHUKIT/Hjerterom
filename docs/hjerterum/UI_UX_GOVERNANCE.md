# UI/UX Governance — Maintaining World-Class Standards

**Version:** 1.0 · July 2026  
**Related:** `PRD.md` §15, `DESIGN_SYSTEM.md`, `REFACTOR_PLAN.md`

How we **keep** Boly-quality UX while shipping Hjerterum — not just define it once.

---

## 1. Governance model

```
Product (PRD §15)  →  defines what "good" means
DESIGN_SYSTEM.md   →  defines how to build it
This document      →  defines how to enforce it
Cursor rules/skill →  automates guidance for agents & devs
CI + review        →  catches regressions
```

**Owner:** Product + engineering shared. UX regressions are **P0** on production social flows.

---

## 2. Definition of done (UI)

A frontend PR is not done unless:

- [ ] Uses design-system components for toast, confirm, loading, empty states
- [ ] No `alert()` / `confirm()` / hard-coded colour hex in TSX
- [ ] User-facing strings via i18n keys
- [ ] Touch targets ≥44px on interactive controls
- [ ] Verified at 320px width (no unintended horizontal scroll)
- [ ] Light + dark checked if touching `globals.css` or Boly App routes
- [ ] Lane colours use tokens if touching calendars
- [ ] `npm run lint` passes
- [ ] Smoke routes pass (`npm run test:e2e` when feasible)
- [ ] PR description includes **UI plane** (Boly App / Finn / Los / Ops / Marketing)

---

## 3. PR review checklist (copy into PR template)

### 3.1 Visual plane

- [ ] Uses **Universal Boly Standard** — not a white-screen / light-only new module
- [ ] **Dark and light** both tested on changed flows
- [ ] **Sámi (`se`) key for every new user-facing string** — ship gate
- [ ] **Norwegian + Sámi + English only** — no Swedish/Danish
- [ ] Dark default verified (including Finn/Los if touched)
- [ ] Logged-in theme/locale persistence considered

### 3.2 Components

- [ ] Checked design-system catalogue before creating new components
- [ ] New shared component added to `design-system/index.ts` if reused

### 3.3 Accessibility

- [ ] Keyboard path works for new interactions
- [ ] Focus visible on interactive elements
- [ ] Form errors linked with `aria-describedby` or `FieldInput` pattern
- [ ] Images/icons have accessible names where needed

### 3.4 Mobile

- [ ] Safe-area insets on fixed elements
- [ ] Tables use horizontal scroll wrapper
- [ ] Input font ≥16px on mobile

### 3.5 i18n

- [ ] `no`, `se` (Sámi), and `en` keys added for new copy
- [ ] Locale code `se` documented as Sámi — not Swedish
- [ ] No hard-coded user-facing strings in TSX

---

## 4. Automated enforcement

| Mechanism | What it catches | Location |
|-----------|-----------------|----------|
| ESLint `max-lines: 800` | Megasite growth | `frontend/eslint.config.mjs` |
| ESLint / grep | `alert(` / `confirm(` | CI (manual grep today) |
| Playwright smoke | Route 5xx / missing routes | `frontend/e2e/smoke.spec.ts` |
| `npm run lint` | TS/ESLint issues | CI |
| **Planned:** screenshot diff | Visual regression | Playwright — before tourism GA |
| **Planned:** stylelint | Unknown hex in CSS | Optional |

### 4.1 Recommended CI additions (backlog)

```bash
# Block native dialogs in app code
rg 'window\.(alert|confirm)|\balert\(|\bconfirm\(' frontend/app frontend/features --glob '*.{ts,tsx}' && exit 1 || true

# Block inline hex colours in TSX (warning first)
rg 'style=\{\{[^}]*#[0-9a-fA-F]{3,8}' frontend --glob '*.tsx'
```

Track in `PRD.md` §14 open decisions.

---

## 5. Refactor wave UX gates

From `REFACTOR_PLAN.md` — each wave must preserve UX:

| Wave | UX gate |
|------|---------|
| W1–W4 | Toast/confirm; no new alerts; skeleton on extracted pages |
| W5 (listing detail split) | Owner vs nav views visually identical to pre-split |
| W6 (route groups) | No subdomain routing regressions; smoke pass |

**Smoke checklist (mandatory per wave PR):**
1. `/homeowner/manage` — list loads, lane calendar renders
2. `/nav/database` — table scrolls on mobile width
3. `/nav/messages` — thread list loads
4. `/finn` — search page loads in **dark and light**; language selector visible

---

## 6. Release cadence

### 6.1 Pre-release (any production deploy touching UI)

1. Run smoke e2e
2. Spot-check 320px + 1280px on changed flows
3. Caseworker or landlord **smoke sign-off** for nav/homeowner changes

### 6.2 Quarterly UX audit

| Activity | Output |
|----------|--------|
| Lighthouse accessibility on 4 core URLs | Score + issue list |
| axe DevTools on formidling + manage flows | WCAG violations |
| Copy audit (Boly vs Hjerterum strings) | i18n fix tickets |
| Megasite line count review | Refactor priority |
| Device matrix spot-check | `PRD.md` §15.6 |

### 6.3 Hjerterum v2 phase gate

Each v2 rollout phase (`PRD.md` §15.5) requires:
- Contrast check (WebAIM or Lighthouse)
- PO visual approval screenshot
- Rollback plan (remove `hjerterum-v2.css` scope)

---

## 7. Agent & developer tooling

### 7.1 Cursor rules

| Rule | Scope |
|------|-------|
| `.cursor/rules/ui-ux-design.mdc` | General WCAG + mobile principles |
| `.cursor/rules/hjerterum-design-system.mdc` | Boly/Hjerterum-specific tokens, planes, components |

### 7.2 Cursor skill

`.cursor/skills/hjerterum-ui/SKILL.md` — invoke when building or reviewing UI.

### 7.3 Agent briefs

`docs/hjerterum/agents/*.md` — each wave brief should link `DESIGN_SYSTEM.md` and include UI items from §3 above.

---

## 8. Escalation & exceptions

| Situation | Process |
|-----------|---------|
| New colour outside tokens | Requires PRD + DESIGN_SYSTEM update |
| Third-party embed (Stripe, maps) | Document exception; wrap in branded container |
| Accessibility exception | Document in PR; must have remediation ticket |
| Emergency hotfix skipping audit | Follow up audit within 5 business days |

---

## 9. Metrics dashboard (recommended)

Track in ops or manual spreadsheet until automated:

| Metric | Target |
|--------|--------|
| Lighthouse a11y (app home) | ≥90 |
| Smoke e2e pass rate | 100% |
| Open UX-PRD items (§15.3) | Trending down |
| Megasite count (>800 lines) | Trending down |
| `alert`/`confirm` count | 0 |

---

## 10. World-class bar — what we commit to

**We will:**
- Match or exceed WCAG 2.1 AA on all primary flows
- Keep Boly App interaction patterns stable through Hjerterum expansion
- Maintain four intentional visual planes without visual debt
- Treat mobile as a first-class client (PWA + Capacitor)
- Use professional feedback patterns (never blocking browser dialogs)

**We will not (v1):**
- Ship always-light-only modules (Finn/Los white screens)
- Ship any user-facing string without Norwegian, **Sámi**, and English keys
- Add Swedish, Danish, or other locale codes
- Chase Dribbble aesthetics at the cost of caseworker data density

**Honest gap:** We do not yet have automated visual regression or Storybook. Governance relies on PR discipline + quarterly audit until those ship.

---

*Update this document when enforcement mechanisms change.*
