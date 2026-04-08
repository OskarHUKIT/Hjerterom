# Detailed guide: where every secret lives and where to paste it

This document matches the **BoLy** codebase (`frontend/`, `supabase/functions/`). Use your **actual** project ref everywhere you see `<PROJECT_REF>`.

---

## 0. Find your Supabase project reference (`<PROJECT_REF>`)

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click your **project** (not “Organization” settings).
3. Look at the **browser address bar**. The URL looks like:  
   `https://supabase.com/dashboard/project/abcdefghijklmnop/settings/api`  
   The segment **`ayddwbmkclujefnhsaqv`** (20 lowercase letters/digits) is **`<PROJECT_REF>`**.
4. Your **API base URL** is always:  
   `https://ayddwbmkclujefnhsaqv.supabase.co`  
   (No trailing slash when pasting into env files.)

---

## 1. Supabase: Project API keys (publishable, anon, secret / service role)

These are **not** Edge Function “custom secrets” for hosted projects — they come from the **API** settings page. You copy them **from here** into your app env and (for the secret key) into places that need server-side access.

### Steps

1. In the left sidebar, click the **gear icon** → **Project Settings** (or **Settings** at the bottom).
2. Open **API** in the sub-menu (sometimes grouped under **Data API**).
3. On this page you will see:
   - **Project URL** — copy exactly (`https://<PROJECT_REF>.supabase.co`).
   - A **publishable** (or **public**) key section — in the UI this is often labeled **Publishable key** and/or **anon** **`public`**. This is a long JWT. It is **safe to use in the browser** (with Row Level Security enforced).
   - A **secret** keys section — labeled **Secret keys** (or similar). Here you find **`service_role`** (may still show the legacy label **`service_role` `secret`**). This key **bypasses RLS** and must stay server-side only.

**How the labels map**

| What you see in the dashboard | Role | Use in BoLy |
|------------------------------|------|-------------|
| **Publishable key** / **anon** `public` | Public, RLS applies | `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local` |
| **Secret keys** → **service_role** | Full database access | Webhooks, server scripts, never in the frontend bundle |

The **anon** key is still the same underlying “anonymous” key Supabase has always used; the dashboard may emphasize “publishable” as the product name for that key.

### Where to put them

| Value | Environment variable name | Where it goes |
|--------|---------------------------|----------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | File `frontend/.env.local` (and Vercel/hosting **Environment Variables** for Production/Preview). |
| Publishable / **anon** `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same: `frontend/.env.local` + hosting. Must be the **anon/publishable** key, **not** `service_role`. |
| **service_role** (under Secret keys) | Usually **not** in `frontend/.env.local` | Only server-side: CI, custom backends, **Database Webhook** `Authorization: Bearer …` if you configure one. |

**After editing `frontend/.env.local`:** stop and restart `npm run dev`.

### Reserved secrets on hosted Edge Functions

On **Project Settings → Edge Functions → Secrets**, Supabase may list **reserved** names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, sometimes `SUPABASE_DB_URL`.

- You **cannot** edit/delete those manually — they are **injected** from the same project API keys above.
- When you **rotate** the publishable or secret keys under **Settings → API**, new values apply to the project; redeploy functions if your workflow requires it (`supabase functions deploy ...`).

---

## 2. Supabase: Custom Edge Function secrets (you create these)

These are **only** the names your **code** reads with `Deno.env.get("...")`. You add them yourself.

### Steps (Dashboard)

1. **Project Settings** (gear) → **Edge Functions** → **Secrets** (or **Manage secrets**).
2. Click **Add new secret** / **New secret**.
3. Enter **Name** (exact spelling, case-sensitive) and **Value**.
4. Save.

### Steps (CLI alternative)

From your machine (with Supabase CLI logged in and project linked):

```bash
supabase secrets set SIGNICAT_SECRET_LOGIN="paste-value-here" --project-ref <PROJECT_REF>
supabase secrets set SIGNICAT_SECRET_SIGN="paste-value-here" --project-ref <PROJECT_REF>
supabase secrets set SIGNICAT_CLIENT_ID_SIGN="your-api-client-id" --project-ref <PROJECT_REF>
supabase secrets set VAPID_KEY="paste-private-key" --project-ref <PROJECT_REF>
supabase secrets set VAPID_PUBLIC_KEY="paste-public-key" --project-ref <PROJECT_REF>
supabase secrets set RESEND_API_KEY="re_..." --project-ref <PROJECT_REF>
supabase secrets set SMTP_FROM="noreply@yourdomain.com" --project-ref <PROJECT_REF>
```

Repeat for any SMTP variables you use (see section 5).

### Full list used by this repo’s functions

| Secret name | Used in | Required? |
|-------------|---------|-----------|
| `SIGNICAT_SECRET_LOGIN` | `auth-signicat` | Yes for BankID/OIDC login |
| `SIGNICAT_SECRET_SIGN` | `sign-agreement` | Yes for document signing API |
| `SIGNICAT_CLIENT_ID_SIGN` | `sign-agreement` | **Production:** set to the same API client’s **Client ID** as the secret (Signicat → Settings → API clients). If unset, code falls back to sandbox ID for local dev only. |
| `VAPID_KEY` (or `VAPID_PRIVATE_KEY` or `VAPID-KEY`) | `send-push` | Yes for web push |
| `VAPID_PUBLIC_KEY` | `send-push` | Recommended (else default in code) |
| `RESEND_API_KEY` | `send-notification-email` | Optional if using Resend |
| `SMTP_FROM` or `RESEND_FROM` | `send-notification-email` | With Resend or SMTP |
| `SMTP_HOSTNAME`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_PORT`, `SMTP_SECURE` | `send-notification-email` | If using SMTP instead of Resend |
| `NOTIFICATION_APP_BASE_URL` | `send-notification-email` | Optional (default production URL in code) |
| `NOTIFICATION_FROM_NAME` | `send-notification-email` | Optional |
| `NOTIFICATION_SUPPORT_EMAIL` | `send-notification-email` | Optional |
| `TERMS_FALLBACK_PDF_URL` | `sign-agreement` | Optional |

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read by functions but are **reserved/injected** on hosted Supabase — do **not** duplicate them as custom secrets unless your team uses a self-hosted setup that requires it.

---

## 3. Signicat (production): where to find each secret

Use your **production** Signicat organisation/account (not sandbox). Sign in at [Signicat Dashboard](https://dashboard.signicat.com). If your organisation has both sandbox and production, switch to the **production** account/domain before copying IDs and secrets.

BoLy uses **two** separate Signicat integrations — each has its **own** client ID and secret in the Dashboard.

---

### A) BankID login (OpenID Connect) — secret `SIGNICAT_SECRET_LOGIN`

**Code:** `supabase/functions/auth-signicat/index.ts` reads `SIGNICAT_SECRET_LOGIN` and a **discovery URL** + **CLIENT_ID** constant you must align with production.

#### Where to find the Client ID and Client secret (OIDC)

1. In the Signicat Dashboard, go to **Products** → **eID and Wallet Hub** → **OIDC clients**  
   Direct link pattern: `https://dashboard.signicat.com/oidc-clients/` (same path in production).
2. Open your **production** OIDC client (**Edit** next to the client name), or create one (**Create** / add client) if you do not have one yet.
3. **Client ID**  
   - Open the **Overview** tab on that client. The **Client ID** is shown in the client overview (Signicat uses readable IDs such as three words and numbers, e.g. `prod-…` style depending on environment).
4. **Client secret** (this is what you store as `SIGNICAT_SECRET_LOGIN`)  
   - Open the **Secrets** tab.  
   - Click **Add secret** → enter a label → **Generate secret**.  
   - **Copy the value immediately** — Signicat shows the plaintext secret **only once** when it is created. If you lose it, add a **new** secret and update Supabase; you can revoke old secrets from the same tab.
5. **Redirect URI** (must match your Supabase function exactly)  
   - Open the **URIs** tab.  
   - Add **Redirect URI**:  
     `https://<PROJECT_REF>.supabase.co/functions/v1/auth-signicat`  
   - Save (**Update**). Optional: add a second URI for local Supabase (`http://127.0.0.1:54321/functions/v1/auth-signicat`) only if you test with the local CLI and Signicat allows it.

#### Where to find the OIDC discovery URL (production)

Your authorisation server is tied to your **Signicat domain** (organisation/account), not to sandbox hostnames.

1. **Discovery document** (used by the Edge Function to read `authorization_endpoint`, etc.):  
   `https://<YOUR_SIGNICAT_DOMAIN>/auth/open/.well-known/openid-configuration`  
   Replace `<YOUR_SIGNICAT_DOMAIN>` with your production issuer host (for sandbox, BoLy used `….sandbox.signicat.com`; production is typically **`….signicat.com`** without `.sandbox` — exact hostname is assigned per account).
2. How to get `<YOUR_SIGNICAT_DOMAIN>`:  
   - Check Signicat’s onboarding email or **organisation / domain** settings in the Dashboard, or  
   - Open the OIDC client **Overview** / documentation links for your tenant, or  
   - Ask Signicat support for the **OIDC issuer URL** for your production domain.
3. Paste that full discovery URL into `SIGNICAT_DISCOVERY_URL` in `auth-signicat/index.ts` (replace any old sandbox URL).
4. Set `CLIENT_ID` in the same file to the **Client ID** from step 3 above.

Then deploy: `supabase functions deploy auth-signicat --project-ref <PROJECT_REF>`.

**Frontend:** `login/page.tsx` builds the BankID entry URL from `NEXT_PUBLIC_SUPABASE_URL` + `/functions/v1/auth-signicat` — the **Supabase project URL** must match the host used in the redirect URI you registered in Signicat.

---

### B) Document signing (Sign API, client credentials) — secret `SIGNICAT_SECRET_SIGN`

**Code:** `supabase/functions/sign-agreement/index.ts` uses **HTTP Basic** auth to `https://api.signicat.com/auth/open/connect/token` with `grant_type=client_credentials` and scope `signicat-api`.

#### Where to find the API Client ID and Client secret

1. In the Signicat Dashboard go to **Settings** → **API clients**  
   Direct link: [dashboard.signicat.com/api-clients](https://dashboard.signicat.com/api-clients/).
2. Select **+ Add client** (or open an existing **production** API client used only for signing).
3. **Client ID** — shown on the **client overview** after creation (format is like `dev-…` / `prod-…` / `sandbox-…` depending on environment — use the **production** client).
4. **Client secret** (maps to `SIGNICAT_SECRET_SIGN`)  
   - You are prompted to create a secret after creating the client, or open the client → **Secrets** tab → **+ Add secret** → **Generate secret**.  
   - **Copy once** when generated; store in Supabase Edge secret **`SIGNICAT_SECRET_SIGN`** (section 2).
5. **Permissions**  
   - Open the **Permissions** tab on the same API client.  
   - Enable the product(s) you need for **Sign** / **eSign** / **Sign API** (exact checkbox names depend on your contract). Save (**Update**).  
   - If you do not see the right product, Signicat’s docs describe **Advanced permissions** under **Access management** → **Permissions** for machine/API clients.

#### Signing redirects (success / cancel / error)

The app sets redirects to:

`https://<PROJECT_REF>.supabase.co/functions/v1/sign-callback?...`

If Signicat or BankID requires **whitelisting** callback URLs for signing sessions, allow URLs starting with:

`https://<PROJECT_REF>.supabase.co/functions/v1/sign-callback`

Deploy: `supabase functions deploy sign-agreement --project-ref <PROJECT_REF>`.

---

### C) Updating BoLy code when moving from sandbox to production

1. **`auth-signicat/index.ts`** — set `SIGNICAT_DISCOVERY_URL` to your production discovery URL; set `CLIENT_ID` to the OIDC **Overview** Client ID; deploy after setting **`SIGNICAT_SECRET_LOGIN`** in Supabase.
2. **`sign-agreement/index.ts`** — set `CLIENT_ID` to the **Settings → API clients** Client ID; deploy after setting **`SIGNICAT_SECRET_SIGN`**.
3. Never commit secrets — only IDs/URLs in git if needed; secrets live in **Supabase Edge → Secrets** only.

---

## 4. Resend (email via HTTPS)

1. Go to [https://resend.com](https://resend.com) → sign in → **API Keys**.
2. Create a key → copy (starts with `re_`).
3. Add domain and verify **sender** email in Resend **Domains**.
4. Put in Supabase Edge secrets:
   - `RESEND_API_KEY` = the API key
   - `SMTP_FROM` = verified sender, e.g. `BoLy <onboarding@yourdomain.com>` (must match Resend’s allowed senders)

Deploy: `supabase functions deploy send-notification-email --project-ref <PROJECT_REF>`

---

## 5. SMTP (alternative to Resend)

If you use Gmail/Google Workspace or another SMTP:

| Secret | Example / note |
|--------|----------------|
| `SMTP_HOSTNAME` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` for 587 |
| `SMTP_USERNAME` | Full email |
| `SMTP_PASSWORD` | App password (not normal password for Google) |
| `SMTP_FROM` | Same as username or allowed alias |

Set all of these in **Edge Functions → Secrets** as in section 2.

---

## 6. VAPID keys (web push)

Generate a key pair (on any machine with Node):

```bash
npx web-push generate-vapid-keys
```

You get **Public Key** and **Private Key**.

- Put **private** in Supabase secret: `VAPID_KEY` (or `VAPID_PRIVATE_KEY`).
- Put **public** in: `VAPID_PUBLIC_KEY`.
- The frontend may need the **same public key** in client code or env if you subscribe to push from the browser — check `frontend` for `VAPID` / `NEXT_PUBLIC` usage.

Deploy: `supabase functions deploy send-push --project-ref <PROJECT_REF>`

---

## 7. Database Webhooks (not “secrets”, but URLs must be correct)

When `notifications` row is inserted, Supabase calls your function URL.

1. Dashboard → **Integrations** (or **Database**) → **Webhooks** / **Database Webhooks**.
2. Create webhook:
   - **Table:** `public.notifications`
   - **Events:** Insert
   - **HTTP Request URL:**  
     `https://<PROJECT_REF>.supabase.co/functions/v1/send-push`  
     and/or  
     `https://<PROJECT_REF>.supabase.co/functions/v1/send-notification-email`
3. If the UI asks for **HTTP Headers**, some setups use:  
   `Authorization: Bearer <service_role JWT>`  
   Copy the **service_role** key from **Settings → API** under **Secret keys** (section 1). Treat it like a password.

---

## 8. Checklist before saying “done”

- [ ] `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable / **anon** `public` only — not `service_role`).
- [ ] Supabase **Settings → API**: keys rotated if needed; project ref matches URLs.
- [ ] Edge secrets: `SIGNICAT_SECRET_LOGIN`, `SIGNICAT_SECRET_SIGN`, VAPID, email (Resend or SMTP).
- [ ] Signicat: redirect URI for OAuth = `https://<PROJECT_REF>.supabase.co/functions/v1/auth-signicat`.
- [ ] Signicat: Sign API client secret in `SIGNICAT_SECRET_SIGN`; signing callbacks use `sign-callback` URL if required by Signicat.
- [ ] Deploy affected functions: `auth-signicat`, `sign-agreement`, `send-push`, `send-notification-email`.
- [ ] Database webhooks point to `https://<PROJECT_REF>.supabase.co/functions/v1/...` with your current ref.

---

## 9. If something still fails

| Symptom | Check |
|---------|--------|
| `redirect_uri mismatch` on BankID | Signicat OAuth client redirect list vs exact URL in section 3A. |
| `SIGNICAT_SECRET_LOGIN` / `_SIGN` errors | Secret name spelling; redeploy function after setting secret. |
| Email never sends | `RESEND_API_KEY` + verified domain, or full `SMTP_*`; logs in **Edge Functions → Logs**. |
| Push never fires | Webhook URL wrong ref; `VAPID_*` set; `send-push` deployed. |

This file is the detailed map for BoLy: use `<PROJECT_REF>` for Supabase, and your **production** Signicat domain plus the Dashboard paths above for OIDC vs API clients.
