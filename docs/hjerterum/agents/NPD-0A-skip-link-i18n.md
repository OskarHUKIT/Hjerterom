# Agent brief — NPD-0A: skipToMain i18n

**Prioritet:** P0 blocker  
**Audit:** UX/UI FAIL — `skipToMain` vises som rå nøkkel  
**Branch suffix:** `npd-0a-skip-i18n`

## Oppgave

Legg til `skipToMain` i `frontend/lib/i18n/common.ts` for alle tre locale-blokker (`no`, `se`, `en`).

Forslag:
- `no`: «Hopp til hovedinnhold»
- `se`: «Njuosat váldosisahtti» (eller etablert Sámi-stil i repoet)
- `en`: «Skip to main content»

## Filer

- `frontend/lib/i18n/common.ts`
- Verifiser: `frontend/app/components/design-system/SkipLink.tsx`

## Akseptansekriterier

- [ ] Ingen side viser strengen `skipToMain` etter hydrering
- [ ] Skip link fungerer med tastatur (Tab → Enter)
- [ ] `npx playwright test e2e/ux-ui-audit.spec.ts` — 0 FAIL på i18n/skip
