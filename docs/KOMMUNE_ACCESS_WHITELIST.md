# Kommune-tilgang via whitelist

E-poster som skal få kommune-tilgang automatisk når de registrerer seg, legges i tabellen `kommune_access_list`. Hver rad har en e-post og en region.

## Flyt

1. **Legg til e-poster** i `kommune_access_list` (e-post + region).
2. **Brukere registrerer seg** med en av disse e-postene (via e-post eller BankID).
3. De får automatisk `role = kommune_ansatt` og `kommune_region` satt til sin region.
4. De ser kun boliger i sin region i boligbanken.

## Administrere listen

### Via appen (krever at du allerede har kommune-tilgang)

1. Logg inn som kommune-ansatt med redigeringsrettigheter.
2. Gå til **Kommune-tilgang** i menyen.
3. Legg til e-post og region, deaktiver eller slett rader.

### Første gangs oppsett (via Supabase)

Før noen kommune-brukere finnes, må de første e-postene legges inn manuelt:

1. Gå til **Supabase Dashboard** → **Table Editor** → **kommune_access_list**.
2. Klikk **Insert row**.
3. Fyll inn:
   - `email`: f.eks. `ansatt@narvik.kommune.no`
   - `region`: f.eks. `Narvik` (må matche `listings.city` for boligene de skal se)
4. Lagre.

Brukere som registrerer seg med disse e-postene får automatisk kommune-tilgang.

## Region

- `region` brukes til å filtrere hvilke boliger brukeren ser.
- Verdien må matche `city` på listingene (f.eks. `Narvik`, `Gratangen`).
- For flere kommuner: bruk kommaseparert verdi, f.eks. `Narvik,Gratangen,Evenes`.
- Brukere uten `kommune_region` (null) ser alle boliger.
