# Grants, invitasjoner og Supabase-oppdateringer

Dokument for å vedlikeholde kommune-tilgang og vanlige Supabase-endringer etter grants-overhaul (`20260608120000_kommune_grants_service_areas.sql`).

---

## Hvor setter jeg tilgang?

| Situasjon | Hvor | Hva du setter |
|-----------|------|----------------|
| **Ny saksbehandler** (før registrering) | `kommune_invitations` eller Ops **bulk-invitasjon** | `email` + `kommune_id` (flere rader per e-post OK) |
| **Eksisterende saksbehandler** | Ops **Kontoer** → Kommunetilgang, eller `user_kommune_grants` | `kommune_id`, `grant_role`, `can_edit` |
| **Chat/admin-gruppering** | Ops **Tjenesteområder** | Medlemmer = legal `kommuner` |
| **Legacy** | `kommune_access_list` | Kun lesing etter backfill — bruk invitasjoner i stedet |

- **I appen (kommune):** `/nav/kommune-access` — inviter per kommune (krever admin-grant).
- **I appen (ops):** `/ops/accounts/[id]` — multi-kommune grants; `/ops/service-areas` — områder.
- **I Supabase:** `user_kommune_grants` + `kommune_invitations`.

Appen resolver tilgang via `get_my_kommune_access()` → `user_kommune_ids`, `region_keys`, `service_area_ids`.

**Utleiere:** Ingen manuell grant — omfang fra `listings` (alle eierens boliger, også avsluttede).

---

## 1. Invitasjoner (kommune_invitations)

### Legg til (SQL)

```sql
insert into kommune_invitations (email, kommune_id, grant_role, can_edit, is_active)
select 'ansatt@narvik.kommune.no', k.id, 'staff', true, true
from kommuner k where k.slug = 'narvik';
```

### Bulk (Ops RPC)

`ops_bulk_invite(p_kommune_ids, p_emails, ...)` — én invitasjon per (e-post, kommune).

---

## 2. Grants (user_kommune_grants)

### Eksisterende bruker

```sql
insert into user_kommune_grants (user_id, kommune_id, grant_role, can_edit, granted_at)
values (
  '<user-uuid>',
  (select id from kommuner where slug = 'gratangen'),
  'staff',
  true,
  now()
);
```

Ops: `ops_set_user_grants(p_user_id, p_grants jsonb)`.

---

## 3. Tjenesteområder

Eksempel: Narvik administrerer Gratangen og Evenes i ett chat-område.

```sql
select ops_upsert_service_area(
  'narvik-region',
  'Nav Narvik (Narvik, Gratangen, Evenes)',
  'active',
  null,
  array[
    (select id from kommuner where slug = 'narvik'),
    (select id from kommuner where slug = 'gratangen'),
    (select id from kommuner where slug = 'evenes')
  ],
  (select id from kommuner where slug = 'narvik')
);
```

---

## 4. Vanlige Supabase-oppdateringer

### Slette brukere

1. Kjør `supabase/scripts/fix_user_delete_cascade.sql` om nødvendig.
2. Authentication → Users → Delete.

### Manglende profil

```sql
select public.sync_profile_for_auth_user(u.id)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

`sync_profile_for_auth_user` konverterer også aktive invitasjoner til grants.

### Endre rolle

**profiles.role:** `homeowner` | `kommune_ansatt` | `kommune_admin` (aldri `platform_operators`).

Per-kommune rettigheter: `user_kommune_grants.can_edit` og `grant_role`.

### Verifikasjon (testmatrise)

- Staff med grant kun til Narvik → ser kun Narvik-listinger/brukere.
- Staff med Narvik + Gratangen + Evenes grants → ser alle tre.
- Utleier med bolig i to tjenesteområder → to separate chatter.
- Utleier med bolig i Narvik + Gratangen (samme område) → én chat.
- Legacy kombinert kommune-rad suspendert; ikke synlig i ops-liste.

---

## 5. Legacy whitelist

`kommune_access_list` er backfylt til `kommune_invitations` / grants. Ikke legg nye rader i whitelist — bruk invitasjoner eller ops grants.

RLS og `kommune_listing_region_ok` har legacy fallback inntil prod er verifisert.
