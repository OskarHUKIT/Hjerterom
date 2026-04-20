# Boly — launch drift sign-off

Manuell kryssliste før produksjon («Sinking Ship»). **Git alene krysser ikke av disse.** Fyll inn ansvarlig (initialer/navn) og dato når punktet er verifisert.

| # | Punkt | OK | Ansvarlig | Dato | Notat |
|---|--------|----|------------|------|--------|
| 1 | Ingen `service_role`, SMTP-passord eller andre hemmeligheter i `NEXT_PUBLIC_*` eller klientbygg | ☐ | | | Skann Vercel / lokalt `.env` som bygges inn |
| 2 | Supabase Auth: JWT expiry / refresh i tråd med krav | ☐ | | | Dashboard → Authentication → Settings |
| 3 | PITR eller planlagt backup + **testet gjenoppretting** (ikke kun «backup på») | ☐ | | | Noter testdato og hvem som utførte |
| 4 | Egen dev-DB vs prod (eller tydelig separasjon); prod peker aldri på dev-prosjekt | ☐ | | | Sammenlign ref i URL og anon-key |
| 5 | Vercel **region** nær brukere og Supabase-prosjekt (EU) | ☐ | | | Se workspace-regel om latency |
| 6 | Edge CORS-origins: `PUBLIC_SITE_URL`, `PUBLIC_SITE_ORIGINS_EXTRA`, `EDGE_FUNCTION_ALLOWED_ORIGINS` dekker prod + staging/preview | ☐ | | | |
| 7 | HTTPS + HTTP→HTTPS redirect på prod-domene | ☐ | | | Manuell sjekk i nettleser |
| 8 | Staging deploy testet; rollback-prosess avtalt (Vercel previous deployment / git revert) | ☐ | | | |

---

## npm audit (frontend)

**Sist kjørt (CI / lokal):** `npm audit fix` uten `--force` — oppdaterte 6 pakker; moderate avhengigheter der det var trygt.

**Gjenstående (per siste rapport):** 2 **high** via `@capacitor/cli` → sårbar `tar`. Fix krever typisk `npm audit fix --force` (kan oppgradere Capacitor major). **Ikke gjør dette uten** å kjøre mobilbygg / `build-mobile` og smoke-test.

| Status | Beskrivelse |
|--------|-------------|
| Akseptert risiko midlertidig | ☐ — noter godkjenner |
| Planlagt oppgradering | ☐ — lenk PR / dato |

---

## Koblinger

- [ENDPOINT_AUTH_MATRIX.md](./ENDPOINT_AUTH_MATRIX.md) — API + Edge Functions + store lister.
