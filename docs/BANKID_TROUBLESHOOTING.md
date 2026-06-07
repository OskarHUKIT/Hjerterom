# BankID-feilsøking

Det er to BankID-fløyer i Boly:

1. **Logg inn med BankID** – innlogging (auth-signicat)
2. **Signer vilkårsavtale** – signering av dokument (sign-agreement)

---

## 1. Logg inn med BankID (fungerer ikke)

**Sjekkliste:**

1. **Deploy auth-signicat:**
   ```powershell
   npx supabase functions deploy auth-signicat
   ```

2. **Supabase Secrets** – Project Settings → Edge Functions → Secrets:
   - `SIGNICAT_SECRET_LOGIN` må være satt

3. **Signicat Dashboard** – BankID-innlogging:
   - Redirect URI må inkludere: `https://ayddwbmkclujefnhsaqv.supabase.co/functions/v1/auth-signicat`
   - Client ID: `sandbox-smug-hair-945` (sandbox)

4. **Nettleser** – Prøv uten ad-blockere, eller i inkognitomodus

---

## 2. Signer vilkårsavtale (fungerer ikke)

### HTTP 401 ved signering (viktigst)

Hvis du får **«This page isn't working» / HTTP ERROR 401** fra `*.functions.supabase.co` når du trykker på signering, betyr det at Edge Function-gatewayen avviser forespørselen. Løsning:

1. **Deploy sign-agreement med JWT-sjekk av** (må gjøres i Supabase):
   ```powershell
   npx supabase login
   npx supabase link --project-ref <ditt-prosjekt-ref>
   npx supabase functions deploy sign-agreement --no-verify-jwt
   ```
   Hvis du deployer fra Supabase Dashboard i stedet, må du for den aktuelle funksjonen **slå av «Enforce JWT»** / «Verify JWT» (avhengig av UI).

2. **Etter at du har byttet nøkkel:** Sjekk at `frontend/.env.local` har **anon-nøkkelen** (ikke service_role):
   - Supabase Dashboard → **Settings** → **API** → **Project API keys** → **anon** (public).
   - Variabel: `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-nøkkel>`.
   - Start dev-server på nytt etter endring av `.env.local`.

**Sjekkliste øvrig:**

1. **Deploy sign-agreement** (uten JWT-sjekk, siden userId valideres i funksjonen):
   ```powershell
   npx supabase functions deploy sign-agreement --no-verify-jwt
   ```
   Alternativt brukes `verify_jwt = false` i `supabase/config.toml` under `[functions.sign-agreement]` hvis prosjektet er linket.

2. **Supabase Secrets:**
   - `SIGNICAT_SECRET_SIGN` må være satt (forskjellig fra SIGNICAT_SECRET_LOGIN!)

3. **Frontend** sender `Authorization: Bearer <anon key>` til sign-agreement. Sjekk at `NEXT_PUBLIC_SUPABASE_ANON_KEY` er satt i `.env.local`.

4. **PDF i Supabase Storage:**
   - Bucket: `documents`
   - Filnavn: **VilkarsavtaleBoligbanken.pdf** (nøyaktig)
   - Test URL: https://ayddwbmkclujefnhsaqv.supabase.co/storage/v1/object/public/documents/VilkarsavtaleBoligbanken.pdf
   - Skal åpne PDF. Hvis 404: sjekk filnavn og at bucketen er public.

5. **Signicat Dashboard** – Signering (e-sign):
   - Client ID: `sandbox-misty-angle-164` (sandbox for signering)
   - Redirect URI for signering er Signicat sin egen – ikke Supabase

---

## Vanlige feil

| Feil | Løsning |
|------|---------|
| "Missing authorization header" | Deploy frontend med Authorization Bearer-token i sign-terms |
| **HTTP 401** / "Invalid response" | Deploy med JWT av: `npx supabase functions deploy sign-agreement --no-verify-jwt`. Byttet du nøkkel, sjekk at det er **anon**-nøkkel i .env.local og restart dev-server. |
| "Invalid JWT" | Samme som 401: deploy med `--no-verify-jwt` (se over). |
| "Edge Function returned non-2xx" | Sjekk Supabase Functions-logg for detaljert feil; ofte JWT eller secret |
| "Kunne ikke laste ned PDF" | Sjekk at VilkarsavtaleBoligbanken.pdf finnes i storage, bucket public |
| "SIGNICAT_SECRET_SIGN mangler" | Legg til secret i Supabase |
| Ingenting skjer ved klikk | Sjekk at auth-signicat/sign-agreement er deployet; prøv annen nettleser |
