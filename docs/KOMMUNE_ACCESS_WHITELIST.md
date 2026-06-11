# Kommune-tilgang (grants og invitasjoner)

Fra migrasjon `20260608120000_kommune_grants_service_areas.sql` er tilgang modellert med **eksplisitte grants** per legal kommune, ikke fritekst-regioner alene.

## Modell

| Tabell | Formål |
|--------|--------|
| `kommuner` | Én rad per legal kommune; `region_keys` er én normalisert bynøkkel (f.eks. `{narvik}`) |
| `user_kommune_grants` | Aktiv tilgang for innloggede saksbehandlere: `user_id` + `kommune_id` + `grant_role` + `can_edit` |
| `kommune_invitations` | Pre-signup invitasjoner (flere rader per e-post tillatt — én per kommune) |
| `kommune_service_areas` | Ops-definerte chat/admin-grupper (f.eks. Narvik-region med Narvik, Gratangen, Evenes) |
| `kommune_access_list` | Legacy whitelist (read-only etter backfill; ikke skriv nye rader her) |

**Utleiere** har ikke manuelle grants — omfang avledes fra `listings.kommune_id` (nåværende og historisk).

## Flyt for nye saksbehandlere

1. **Ops** eller **kommune-admin** legger invitasjon i `kommune_invitations` (e-post + `kommune_id`).
2. Bruker registrerer seg med den e-posten.
3. `sync_profile_for_auth_user` / `apply_kommune_invitations_for_user` oppretter `user_kommune_grants` og setter `profiles.role`.
4. Appen henter regioner via `get_my_kommune_access()` (region_keys fra grants).

## Administrere tilgang

### Ops-konsoll (`/ops`)

- **Kontoer** → velg bruker → **Kommunetilgang**: multi-select av kommuner, `can_edit`, per-kommune admin.
- **Tjenesteområder** (`/ops/service-areas`): grupper kommuner for delt chat.
- **Kommuner** → bulk-invitasjon erstatter gammel e-post-unik whitelist.

### Kommune self-service (`/nav/kommune-access`)

Kommune-admin med redigering kan invitere per kommune (picker, ikke fritekst region).

### Supabase (nødssituasjon)

```sql
-- Gi eksisterende bruker tilgang til Narvik
insert into user_kommune_grants (user_id, kommune_id, grant_role, can_edit)
select '<user-uuid>', k.id, 'staff', true
from kommuner k where k.slug = 'narvik'
on conflict do nothing;
```

## Chat

Landlord↔kommune-meldinger er scoped på `chat_messages.service_area_id`:

- Utleier med bolig i Narvik og Gratangen (samme tjenesteområde) → **én** chat.
- Utleier med bolig i Narvik og Tromsø (ulike områder) → **to** chatter.

## Region / by-matching

Matching skjer i SQL via `normalize_region_key` og `listings.kommune_id`. Klienten stoler på RLS/RPC — ikke lokal parsing som eneste sannhet.

## Migrering fra legacy

Migrasjonen:

1. Splitter bogus kombinerte `kommuner`-rader (f.eks. «Gratangen, Evenes, Narvik»).
2. Oppretter default 1:1 tjenesteområde per kommune + `narvik-region` for Narvik/Gratangen/Evenes.
3. Backfiller grants fra `profiles.kommune_region` og aktiv whitelist.
4. Backfiller `listings.kommune_id` og `chat_messages.service_area_id`.

`profiles.kommune_region` oppdateres fortsatt som display-streng fra grants, men er ikke lenger primær kilde.
