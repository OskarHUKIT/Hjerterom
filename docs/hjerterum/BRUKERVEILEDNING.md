# Hjerterum — brukerveiledning (se og test alle nye funksjoner)

Denne guiden viser hvordan du **aktiverer** og **prøver** alle Hjerterum-moduler etter deploy og Supabase-migrasjon.

---

## 0. Forutsetninger

- [ ] Vercel deploy grønn med Supabase env vars
- [ ] Supabase migrasjoner kjørt (GitHub Action eller SQL)
- [ ] Du er **platform operator** (`seed_platform_operator.sql`)
- [ ] Du kan logge inn på `/ops`

---

## 1. Sentralt kontrollpanel — start her

**URL:** `/ops/platform` (eller Drift → **Plattform**)

| Preset | Når du bruker det |
|--------|-------------------|
| **Kun Boly** | Produksjon i dag — ingen Hjerterum synlig |
| **Hjerterum pilot** | Test Los + turisme uten Finn/Stripe |
| **Full Hjerterum** | Alt på (staging/demo) |

**Anbefalt testrekkefølge:** Boly → pilot → slå på moduler én og én.

Endringer trer i kraft innen ~30 sek (hard refresh om nødvendig).

---

## 2. Oversikt — hvem ser hva

| Modul | Hvem | URL / sted |
|-------|------|------------|
| **Plattformkontroll** | Ops | `/ops/platform` |
| **Sentrale arrangement** | Ops | `/ops/events` |
| **Kommune-toggles** | Ops | `/ops/kommuner/[slug]` |
| **Finn (leietaker)** | Public | `/finn` eller `finn.dittdomene.no` |
| **Digital Los** | Public | `/los` eller `los.dittdomene.no` |
| **Turisme hos utleier** | Utleier | `/homeowner/manage` |
| **Booking-forespørsler** | Utleier | `/homeowner/manage` |
| **Stripe Connect** | Utleier | `/homeowner/manage` |
| **Event-opt-in** | Utleier | `/homeowner/manage` |
| **Arrangement-filter** | Kommune | `/nav/database` |
| **Event-henvendelser** | Kommune | `/nav/event-inquiries` |
| **Los-innboks** | Kommune | `/nav/los-inbox` |
| **Landing-kort** | Alle | Forsiden `/` |

---

## 3. Steg-for-steg: test alle funksjoner

### Steg A — Bekreft Boly-modus (default)

1. `/ops/platform` → **Kun Boly**
2. Forsiden: ingen Finn/Los-kort
3. `/finn` og `/los` skal redirecte eller vise «ikke tilgjengelig»
4. Test formidling: utleier → kommune → boligbank

---

### Steg B — Sentrale arrangement (Ops)

**Aktiver:** `/ops/platform` → slå på **Sentrale arrangement** (eller Full Hjerterum)

1. Gå til **`/ops/events`**
2. **Nytt arrangement** → fyll inn navn, datoer, slug
3. **Publiser** arrangementet
4. Kommune: **`/nav/database`** → filter **Arrangement**
5. Utleier: **`/homeowner/manage`** → event-opt-in på aktuell bolig

**Kommune henvisninger:** `/nav/event-inquiries` (når routing = saksbehandler)

---

### Steg C — Turisme + Finn (leietakerportal)

**Aktiver:** `/ops/platform` → **Finn-portal** + **Turisme-lane**

**Ops — kommune:**
1. `/ops/kommuner/[slug]` → aktiver **Turisme** for kommunen

**Utleier:**
1. `/homeowner/manage` → velg bolig
2. Slå på **turisme** + sett nattpris
3. Legg til tilgjengelighetsperiode med lane **turisme**

**Public (Finn):**
1. Åpne **`/finn`** (eller `finn.dittdomene.no`)
2. Søk etter bolig / se arrangement
3. Send **booking-forespørsel** på listing
4. **`/finn/mine`** — magic link-innlogging for gjest

**Utleier — godta booking:**
1. `/homeowner/manage` → booking-forespørsler → godta/avslå

---

### Steg D — Stripe (betaling)

**Aktiver:** `/ops/platform` → **Stripe-bookinger**

**Krever env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

1. Utleier: **Koble til Stripe** på `/homeowner/manage`
2. Gjest: `/finn/book/[id]` → betal
3. Webhook: `https://dittdomene.no/api/webhooks/stripe`

---

### Steg E — Digital Los

**Aktiver:** `/ops/platform` → **Los-portal**

**Ops — kommune:**
1. `/ops/kommuner/[slug]` → aktiver **Digital Los**

**Public:**
1. **`/los`** → start chat (anonym)
2. Fullfør samtale → **overlevering**

**Kommune:**
1. **`/nav/los-inbox`** → se overleverte saker

---

## 4. Domener (valgfritt, produksjon)

Legg i Vercel:

| Domene | Effekt |
|--------|--------|
| `app.dittdomene.no` | Hovedapp |
| `ops.dittdomene.no` | Drift |
| `finn.dittdomene.no` | Leietaker (når aktivert) |
| `los.dittdomene.no` | Digital Los (når aktivert) |

Middleware router automatisk.

---

## 5. Kontoer du trenger for full test

| Rolle | Hvordan |
|-------|---------|
| **Ops** | `seed_platform_operator.sql` |
| **Utleier** | Registrer på `/login` |
| **Kommune** | Registrer + sett `role = kommune_ansatt` i Supabase Auth metadata og `profiles` |
| **Gjest (Finn)** | Booking-forespørsel → magic link på e-post |

Se `docs/TEST_ACCOUNTS_SETUP.md`.

---

## 6. Feilsøking

| Problem | Løsning |
|---------|---------|
| Ser ikke Finn/Los | `/ops/platform` — sjekk modul + vent 30s + hard refresh |
| Ingen `/ops` | Kjør `seed_platform_operator.sql` |
| Tom boligbank på Finn | Turisme av hos utleier + lane «turisme» på periode |
| Los-innboks tom | Overlever chat fra `/los` først |
| Stripe feiler | Sjekk Vercel env + webhook URL |

---

## 7. Relaterte dokumenter

- `docs/hjerterum/PLATFORM_CONTROL_PANEL.md` — teknisk kontrollpanel
- `docs/hjerterum/SUPABASE_DEPLOY.md` — deploy-sjekkliste
- `docs/hjerterum/OPS_EVENT_RUNBOOK.md` — arrangement i drift
