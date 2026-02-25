# BankID-feilsøking

Det er to BankID-fløyer i Bo.ly:

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

**Sjekkliste:**

1. **Deploy sign-agreement** (uten JWT-sjekk, siden userId valideres i funksjonen):
   ```powershell
   npx supabase functions deploy sign-agreement --no-verify-jwt
   ```
   Alternativt brukes `verify_jwt = false` i `supabase/config.toml` under `[functions.sign-agreement]` hvis prosjektet er linket.

2. **Supabase Secrets:**
   - `SIGNICAT_SECRET_SIGN` må være satt (forskjellig fra SIGNICAT_SECRET_LOGIN!)

3. **Frontend må ha Authorization-header** – Sjekk at `sign-terms/page.tsx` sender:
   ```javascript
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${session.access_token}`,
   }
   ```
   Push til GitHub slik at Vercel deployer ny versjon.

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
| "Invalid JWT" | Re-deploy med JWT av: `npx supabase functions deploy sign-agreement --no-verify-jwt` |
| "Edge Function returned non-2xx" | Sjekk Supabase Functions-logg for detaljert feil; ofte JWT eller secret |
| "Kunne ikke laste ned PDF" | Sjekk at VilkarsavtaleBoligbanken.pdf finnes i storage, bucket public |
| "SIGNICAT_SECRET_SIGN mangler" | Legg til secret i Supabase |
| Ingenting skjer ved klikk | Sjekk at auth-signicat/sign-agreement er deployet; prøv annen nettleser |
