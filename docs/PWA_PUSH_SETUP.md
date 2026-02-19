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

1. Gå til **Supabase Dashboard → Database → Webhooks**
2. Klikk **Create webhook**
3. **Navn:** `on-notification-insert`
4. **Tabell:** `notifications`
5. **Hendelser:** kun **Insert**
6. **URL:** `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/send-push`
7. **HTTP Headers:** Legg til Authorization med service_role key (hvis Supabase ber om det)
8. Lagre

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
