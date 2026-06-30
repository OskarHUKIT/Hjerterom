# Hjerterum — fresh Supabase install (nytt prosjekt)

**VIKTIG:** Kjør dette **kun** på det nye Hjerterum Supabase-prosjektet.  
**Ikke** pek GitHub Secrets eller Vercel env mot eksisterende Boly-produksjon.

---

## 1. Opprett nytt Supabase-prosjekt

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Noter **Project ref** og **Database password**
3. Dette prosjektet er **kun for Hjerterum**

---

## 2. GitHub Secrets (kun Hjerterum-prosjektet)

| Secret | Verdi |
|--------|-------|
| `SUPABASE_PROJECT_REF` | Ref fra **nytt** Hjerterum-prosjekt |
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database-passord for **nytt** prosjekt |

---

## 3. Hvis du allerede prøvde push og fikk delvis schema

Kjør **én gang** i SQL Editor på **Hjerterum-prosjektet** (ikke Boly):

`supabase/scripts/reset_remote_for_fresh_migrations.sql`

Deretter trigger push på nytt (steg 4).

---

## 4. Kjør migrasjoner

### GitHub Action (iPad/PC)

Rediger og commit:

`.github/trigger-supabase-db-push` → endre `Siste trigger:` dato → commit to `main`

Eller Safari → Actions → **Supabase DB Push** → skriv `push` → Run

### CLI (Mac)

```bash
cd supabase
supabase login
supabase link --project-ref DITT_HJERTERUM_REF
supabase db push --yes
```

---

## 5. Etter migrasjon

1. **Vercel env** → pek til **Hjerterum** URL og keys (ikke Boly)
2. `seed_platform_operator.sql` — din e-post
3. Auth redirect URLs for Hjerterum-domene
4. Storage buckets (listings m.m. opprettes av migrasjoner)
5. `/ops/platform` → **Kun Boly** som default

---

## 6. Hva ble kjørt mot Boly?

GitHub Actions endrer **bare** prosjektet i `SUPABASE_PROJECT_REF`.  
Hvis den secret pekte til nytt Hjerterum-prosjekt, er **Boly urørt**.

Tidligere «existing Boly»-modus i Action er **fjernet** — kun full `db push` til secrets-prosjektet.

---

## 7. Innlogging: «Kunne ikke nå innloggingstjenesten»

`.env.local` gjelder **kun lokalt**. På Vercel teller **Environment Variables** + **redeploy**.

1. Vercel → Settings → Environment Variables → **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://REF.supabase.co` (uten trailing `/`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key fra **samme** Hjerterum-prosjekt
2. **Redeploy** etter endring
3. Test: `https://dittdomene.no/api/health/supabase` → skal vise `"ok": true`
4. Supabase Dashboard → prosjekt **Active** (ikke Paused)
5. Authentication → URL Configuration → Site URL + Redirect URLs for domenet ditt

---

Se også: `SUPABASE_DEPLOY.md`, `BRUKERVEILEDNING.md`, `PLATFORM_CONTROL_PANEL.md`
