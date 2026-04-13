# PWA Push-varsler – slik setter du det opp

## Oversikt

Appen støtter nå push-varsler på mobil når den installeres som PWA (Add to Home Screen). Følg stegene nedenfor.

---

## Steg 1: SQL – push_subscriptions-tabell

Kjør i **Supabase Dashboard → SQL Editor**:

```sql
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(owner_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "Users can manage own push subscriptions" on push_subscriptions;
create policy "Users can manage own push subscriptions"
  on push_subscriptions for all using (auth.uid() = owner_id);
```

---

## Steg 2: Supabase Secrets

Gå til **Project Settings → Edge Functions → Secrets** og legg til:

| Secret | Verdi |
|--------|-------|
| `VAPID_KEY` | Din private VAPID-nøkkel |
| `VAPID_PUBLIC_KEY` | `BGJpQlyCiUmWuqwKMIf8Tc4eX9vUAT6_HxebrntxaXr638Rf72rYxo9IFrN_e6uY2JTiQlyTWN6t7f_WMgcUnX0` |

---

## Steg 3: Deploy Edge Function

```powershell
cd c:\Users\oskar\Desktop\BoLy
npx supabase functions deploy send-push
```

---

## Steg 4: Database Webhook

1. Gå til **Supabase Dashboard → Integrations → Database Webhooks** (oversikt: `/project/<ref>/integrations/webhooks/overview`)
2. Klikk **New webhook** / **Create** (opprett ny webhook)
3. **Navn:** `on-notification-insert`
4. **Tabell:** `notifications`
5. **Hendelser:** kun **Insert**
6. **URL:** `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/send-push`
7. **HTTP Headers:** Legg til Authorization med service_role key (hvis Supabase ber om det)
8. Lagre

---

## E-post-varsler (valgfritt, krever SMTP-secrets)

Når en bruker har slått på **«Send også varsler på e-post»** under Varsler, kan du sende samme innhold som push via e-post.

### Steg A: Edge Function-secrets

**Project Settings → Edge Functions → Secrets** (samme sted som VAPID):

| Secret | Beskrivelse |
|--------|----------------|
| `SMTP_HOSTNAME` | F.eks. `smtp.gmail.com` (Google Workspace med app-passord) |
| `SMTP_PORT` | `587` (standard hvis utelatt) |
| `SMTP_SECURE` | `false` for port 587 (STARTTLS), `true` for 465 |
| `SMTP_USERNAME` | Full e-postadresse som sender (f.eks. `noreply@bolynorge.no`) |
| `SMTP_PASSWORD` | [App-passord](https://support.google.com/accounts/answer/185833) (Google krever 2-trinns) |
| `SMTP_FROM` | Avsenderadresse (ofte samme som `SMTP_USERNAME`) |
| `NOTIFICATION_FROM_NAME` | Valgfritt visningsnavn, standard `Boly` |
| `NOTIFICATION_APP_BASE_URL` | Valgfritt: produksjons-URL uten trailing slash (f.eks. `https://bolynorge.no`) for lenke i e-posten |

Uten SMTP *eller* Resend (se under) returnerer funksjonen «skipped».

**Alternativ uten SMTP (anbefalt hvis du får 500 / tilkoblingsfeil mot Gmail):**  
Legg til **Edge Function secrets** `RESEND_API_KEY` (fra [resend.com](https://resend.com)) og `SMTP_FROM` (eller `RESEND_FROM`) med en **verifisert avsender** i Resend. Funksjonen bruker da Resend over HTTPS (port 443) og trenger ikke `SMTP_*`.

**Merk:** Noen miljøer blokkerer utgående SMTP på 587/465. Da vil **SMTP** feile med 500 i loggene; bruk **Resend** som over.

### Steg B: Deploy

```powershell
cd c:\Users\oskar\Desktop\BoLy
npx supabase functions deploy send-notification-email
```

### Steg C: Ekstra database-webhook

1. **Integrations → Database Webhooks → New webhook**
2. **Navn:** f.eks. `on-notification-insert-email`
3. **Tabell:** `notifications`, hendelse **Insert**
4. **URL:** `https://<PROSJEKT-REF>.supabase.co/functions/v1/send-notification-email`
5. **HTTP Headers:** `Authorization: Bearer <service_role key>` (samme mønster som for `send-push`)

Da kjøres både push og e-post uavhengig av hverandre når et varsel opprettes.

**Skal fungere for alle kontoer uten manuell SQL:** Når en bruker slår på «Send også varsler på e-post», lagres `profiles.email_notifications_enabled` automatisk. Hvert **INSERT** i `notifications` med riktig `owner_id` skal utløse webhook/trigger og Edge-funksjonen. Du trenger **ikke** sette UUID manuelt.

**Hvis ingen e-post:** (1) Bekreft at **webhook eller trigger** faktisk kjører (tomme Edge-logger = ingen HTTP-kall). (2) Sjekk **Edge → Logs** ved et varsel – skal ikke være `skip` med feil årsak. (3) Bruk **Resend** (`RESEND_API_KEY`) hvis SMTP feiler fra Edge. Diagnostikk-SQL: `supabase/scripts/email_notification_pipeline_check.sql`.

---

## Steg 5: PWA-ikoner (valgfritt)

For beste PWA-opplevelse, legg til ikoner i `frontend/public/`:
- `icon-192x192.png` (192×192 px)
- `icon-512x512.png` (512×512 px)

Oppdater deretter `manifest.json` med disse filnavnene. `logo.png` brukes som fallback.

---

## Steg 6: Deploy frontend

Bygg og deploy til Vercel:

```powershell
cd frontend
npm run build
```

Push til GitHub slik at Vercel deployer automatisk.

---

## Testing

1. Åpne appen på mobil (Chrome/Edge på Android, Safari på iOS 16.4+)
2. Logg inn
3. Gå til **Varsler**-fanen og trykk på **«Aktiver varsler»** – da kommer nettleserens tillatelsesvindu (krever brukertrykk på mobil)
4. Velg «Legg til på hjemskjerm» / «Add to Home Screen»
5. Opprett en varsel i appen (f.eks. markér bolig som formidlet) – brukeren skal få push-varsel

---

## Feilsøking

- **Ingen tillatelsesvindu?** På mobil må du gå til **Varsler**-fanen og **trykke** på «Aktiver varsler» – nettleseren viser ikke tillatelse automatisk uten brukertrykk
- **Ingen varsler?** Sjekk at webhook er aktiv og at `send-push`-funksjonen er deployet
- **410/404 fra push?** Den gamle subscriptionen slettes automatisk; brukeren må logge inn på nytt for å abonnere igjen
- **iOS:** Krever iOS 16.4+ og at PWA er lagt til på hjemskjerm
