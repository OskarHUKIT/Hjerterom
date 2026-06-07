# Storage-bøtte for overtakelsesrapport

Hvis du får **«bucket not found»** når du laster opp bilder i overtakelsesrapporten, mangler storage-bøtten `handover-reports` i Supabase-prosjektet ditt.

## Løsning

### Alternativ 1: Kjøre SQL i Supabase (anbefalt)

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard) → ditt prosjekt.
2. **SQL Editor** → New query.
3. Lim inn og kjør dette:

```sql
-- Opprett bøtte for bilder i overtakelsesrapport
INSERT INTO storage.buckets (id, name, public)
VALUES ('handover-reports', 'handover-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Tillat opplasting (innloggede brukere og leietaker via token)
DROP POLICY IF EXISTS "Allow handover report uploads" ON storage.objects;
CREATE POLICY "Allow handover report uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'handover-reports');

-- Tillat offentlig lesing av filer i bøtten
DROP POLICY IF EXISTS "Public read handover reports" ON storage.objects;
CREATE POLICY "Public read handover reports" ON storage.objects
FOR SELECT USING (bucket_id = 'handover-reports');
```

4. Kjør (Run). Da skal bøtten være opprettet og overtakelsesrapport med bildeopplasting fungere.

### Alternativ 2: Opprette bøtte i Dashboard

1. Supabase Dashboard → **Storage**.
2. **New bucket**.
3. **Name:** `handover-reports` (både id og navn).
4. **Public bucket:** På (så bildene kan vises i rapporter).
5. Lagre.
6. Åpne bøtten → **Policies** og legg til:
   - **Insert:** Tillat for alle (eller «authenticated» + «anon» hvis du bruker leietaker-token).
   - **Select:** Tillat for alle (public read).

---

Etter at bøtten finnes, skal «Legg ved bilder» i overtakelsesrapporten fungere uten «bucket not found».
