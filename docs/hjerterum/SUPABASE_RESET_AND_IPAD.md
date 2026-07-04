# Supabase: rydde eksisterende prosjekt + pushe fra iPad

Denne guiden svarer på to ting:

1. **Hvordan rydde** et eksisterende Supabase-prosjekt før Hjerterum/Boly
2. **Hvordan pushe migrasjoner** uten Mac/PC (f.eks. fra iPad)

Les også `SUPABASE_DEPLOY.md` og `PLATFORM_CONTROL_PANEL.md`.

---

## Del 1 — Tre situasjoner (velg riktig)

### A) Du har allerede Boly på samme Supabase-prosjekt

**Du trenger ikke rydde.** Schema er allerede kompatibelt.

```bash
cd supabase
supabase link --project-ref DITT_PROJECT_REF
supabase db push
```

Kun nye migrasjoner kjøres (typisk de fire Hjerterum-filene fra 2026-06-30). Eksisterende data beholdes.

Etter push:

1. Kjør `supabase/scripts/seed_platform_operator.sql` (bytt e-post)
2. Åpne `/ops/platform` → velg **Kun Boly**

---

### B) Du vil beholde schema, men slette all testdata

Bruk når du har kjørt Boly i test og vil starte med tom database (samme tabeller).

1. **Ta backup først** (Dashboard → Database → Backups → Download, eller `pg_dump`)
2. Kjør `supabase/scripts/cleanup_for_testing.sql` i **SQL Editor**
3. Gå til **Authentication → Users** → velg alle → **Delete users**
4. **Storage** (valgfritt): tøm buckets `listings`, `terms`, `handover-reports` osv. under **Storage**
5. Opprett testkontoer på nytt — se `docs/TEST_ACCOUNTS_SETUP.md`

Dette sletter **ikke** migrasjonshistorikk eller tabellstruktur.

---

### C) Prosjektet inneholdt en annen app / feil schema / du vil starte helt på nytt

**Anbefaling: opprett nytt Supabase-prosjekt.** Det er enklest og tryggest.

| Fordel | Ulempe |
|--------|--------|
| Ingen konflikt med gamle tabeller | Må oppdatere env i Vercel |
| Ren migrasjonshistorikk | Auth-brukere må registreres på nytt |
| Gratis tier får «nytt» kvote-tak | Domener/redirect URLs må oppdateres |

**Hvis du må gjenbruke samme prosjekt** (sletter alt i `public`):

1. **Pause produksjon** / sett app i maintenance
2. Ta **full backup**
3. Kjør `supabase/scripts/reset_remote_for_fresh_migrations.sql` i SQL Editor
4. Push alle migrasjoner på nytt (se Del 2)
5. Deploy edge functions på nytt
6. Oppdater `NEXT_PUBLIC_SUPABASE_*` i Vercel hvis du byttet prosjekt

⚠️ Dette er **irreversibelt** uten backup.

---

## Del 2 — Pushe migrasjoner til Supabase

### Alternativ 1: GitHub Actions fra iPad (anbefalt)

Repoet har workflow **Supabase DB Push** (`.github/workflows/supabase-deploy.yml`).

**Engangsoppsett (Mac/PC eller iPad-nettleser):**

1. Gå til [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token** → kopier
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Verdi |
|--------|-------|
| `SUPABASE_ACCESS_TOKEN` | Token fra steg 1 |
| `SUPABASE_PROJECT_REF` | 20-tegns ref fra prosjekt-URL (f.eks. `abcdefghijklmnop`) |
| `SUPABASE_DB_PASSWORD` | Database-passordet du satte da prosjektet ble opprettet |

3. Finn DB-passord: **Project Settings → Database → Database password** (eller reset der)

**Fra iPad hver gang du vil pushe:**

#### Metode A — Rediger trigger-fil (enklest på iPad)

GitHub-appen viser ofte **ikke** «Run workflow». Bruk dette i stedet:

1. Åpne **Safari** (ikke GitHub-appen):  
   `https://github.com/OskarHUKIT/Hjerterom/blob/main/.github/trigger-supabase-db-push`
2. Trykk **blyant** (Edit)
3. Endre datoen på linjen `Siste trigger:` (f.eks. til dagens tid)
4. **Commit changes** → **Commit directly to main**
5. Gå til **Actions** — **Supabase DB Push** skal starte automatisk

#### Metode B — Run workflow (Safari / PC, krever skriverettighet)

1. **Safari** → [Actions → Supabase DB Push](https://github.com/OskarHUKIT/Hjerterom/actions/workflows/supabase-deploy.yml)
2. **Run workflow** (øverst til høyre — kun synlig med Write/Admin på repo)
3. Skriv `push` → **Run workflow**

Ser du ikke knappen: bruk Metode A, eller sjekk at du er innlogget som eier av repoet (ikke read-only).

4. Vent til grønn hake (~1–2 min)
5. Sjekk Supabase **Database → Migrations** at nye filer er applied

Edge functions deployes med egen workflow **Supabase Functions Deploy** (samme secrets).

---

### Alternativ 2: Supabase Dashboard (SQL Editor) — kun nødssituasjon

Uten CLI kan du lime inn SQL manuelt:

1. Dashboard → **SQL Editor → New query**
2. Lim inn **hele innholdet** av én migrasjonsfil om gangen, i **filnavn-rekkefølge**
3. **Run** for hver fil

Start med alle filer i `supabase/migrations/` sortert etter dato — eller kun de du mangler (sjekk **Database → Migrations**).

**Ulemper:** Lett å glemme filer, ingen `supabase_migrations`-registrering hvis du ikke også oppdaterer historikktabellen — CLI/`db push` er tryggere.

---

### Alternativ 3: Mac/PC med Supabase CLI

```bash
# Installer CLI: https://supabase.com/docs/guides/cli
brew install supabase/tap/supabase   # macOS

cd supabase
supabase login                        # åpner nettleser
supabase link --project-ref DITT_PROJECT_REF
supabase db push                      # migrasjoner
supabase functions deploy los-chat    # + andre functions ved behov
```

---

### Alternativ 4: iPad med terminal-app (avansert)

- **a-Shell** / **iSH**: begrenset — Supabase CLI er vanskelig å installere stabilt på iPad
- **SSH til Mac/server** via Termius + repo klona der → kjør CLI som over
- **Cursor / GitHub Codespaces** i Safari på iPad → full Linux-terminal

For de fleste er **GitHub Actions (Alternativ 1)** enklest på iPad.

---

## Del 3 — Komplett checklist etter reset/push

### Database

- [ ] Alle migrasjoner applied (93 filer totalt, eller kun nye hvis eksisterende Boly)
- [ ] `seed_platform_operator.sql` kjørt med din e-post
- [ ] `/ops/platform` viser **Kun Boly** som default

### Auth (Dashboard → Authentication)

- [ ] **Site URL**: produksjonsdomene (f.eks. `https://app.bolynorge.no`)
- [ ] **Redirect URLs**: `https://dittdomene.no/**` og localhost for dev
- [ ] Recovery-mal: `supabase/templates/recovery.html`

### Storage

- [ ] Buckets finnes (opprettes av migrasjoner / manuelt ved behov)
- [ ] Policies OK etter reset

### Edge Functions

```bash
supabase functions deploy sign-agreement
supabase functions deploy send-notification-email
supabase functions deploy los-chat
# + øvrige i supabase/functions/
```

Eller trigger **Supabase Functions Deploy** i GitHub Actions.

### Vercel

Oppdater (eller bekreft) i **Project → Settings → Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Redeploy frontend etter env-endring.

---

## Del 4 — Feilsøking

| Problem | Løsning |
|---------|---------|
| `db push` sier migrasjon allerede kjørt | Normalt — hoppes over. Sjekk at siste fil er `20260630210000_...` |
| `relation already exists` | Prosjekt har delvis gammelt schema → bruk **C** (nytt prosjekt eller reset-script) |
| `password authentication failed` | Reset DB-passord i Dashboard, oppdater `SUPABASE_DB_PASSWORD` secret |
| GitHub Action feiler på link | Sjekk at `SUPABASE_PROJECT_REF` er riktig (kun ref, ikke full URL) |
| Tom `/ops` | Kjør `seed_platform_operator.sql` etter at bruker finnes i Auth |
| Storage full | Tøm buckets i Dashboard; vurder nytt prosjekt på free tier |

---

## Hva du bør gjøre nå (kort)

1. **Eksisterende Boly-prosjekt?** → Sett GitHub secrets → Run **Supabase DB Push** fra iPad
2. **Gammelt/ukjent prosjekt?** → Opprett **nytt** Supabase-prosjekt → secrets → push → oppdater Vercel env
3. **Kun testdata bort?** → `cleanup_for_testing.sql` + slett Auth-brukere (ingen schema-endring)
