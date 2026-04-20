# Technical & data-flow analysis (repository evidence)

**Scope:** Boly frontend (`frontend/`), Supabase migrations (`supabase/migrations/`), Edge Functions (`supabase/functions/`), internal docs (`docs/`).  
**Date:** Generated from codebase structure; re-run when architecture changes.

---

## 1. Application architecture

| Layer | Technology | Privacy relevance |
|-------|------------|-------------------|
| Web / PWA | Next.js (App Router), React | Server and client components; cookies for auth session |
| Backend / DB / Auth | Supabase (PostgreSQL, Auth, Storage, RLS) | Personal data at rest; Row Level Security; `auth.users` |
| Serverless | Supabase Edge Functions (Deno) | BankID, signing, email, push; secrets in Supabase |
| Email | Mailjet REST API and/or SMTP (Edge Functions `send-notification-email`, `notify-terms-central-review`) | Message/notification content may appear in email |
| Identity / signing | Signicat (OIDC for BankID login; Sign API for agreements) | Special category risk low for typical BankID metadata; legal basis must be documented |
| Push | Web Push (VAPID); `push_subscriptions` table | Device endpoint + optional user agent |
| Mobile | Capacitor (see `docs/CAPACITOR_DETAILED_GUIDE.md`, `MOBILE_APP_STORE_GUIDE.md`) | Same backend; store listings may reference device identifiers |
| Hosting (typical) | Vercel or similar for Next.js (referenced in translations for env vars) | IP, logs; confirm in questionnaire |

**Environment variables (public, browser):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, timeouts, storage cache bust. **Never** expose `service_role` in the client (`docs/SECRETS_CONFIGURATION_GUIDE.md`).

---

## 2. Categories of personal data (inferred)

### 2.1 Authentication & profile

- **Source:** `auth.users` (Supabase), `public.profiles` (`baseline_profiles_table.sql` and later migrations).
- **Examples:** `id`, `email`, `full_name`, `role` (e.g. homeowner, kommune staff, kommune admin), `updated_at`, kommune region fields, `email_notifications_enabled`, `preferred_locale`, display/notification preferences.
- **Signup metadata:** `login/page.tsx` sends `full_name`, `contact_phone`, `provider` in `signUp` options.

### 2.2 Listings & housing mediation

- **Table:** `listings` and related (availability, mediation reservations, invoice basis, pet policy, etc.).
- **Examples:** Addresses, pricing, descriptions, mediation notes, landlord identifiers, kommune-scoped visibility per RLS.

### 2.3 Messaging

- **Table:** `chat_messages` (referenced across migrations); columns include `content`, `sender_id`, `receiver_id`, `image_urls` (chat images bucket).
- **Risk:** Free-text may contain accidental sensitive data; UI includes a discrete warning (`messagesSensitiveDataNotice`).

### 2.4 Notifications

- **Table:** `notifications`; webhook triggers Edge Functions on insert.
- **Email pipeline:** `notify_kommune_on_message` builds `message` field including **up to 7500 chars of message body** for kommune notifications (`20260331170000_message_body_in_notification_email.sql`). **Disclose in privacy notice:** email duplicate may contain message content.

### 2.5 Terms & PDFs / storage

- **Tables:** `terms_documents`, `user_terms_acceptances`.
- **Storage buckets:** Documents, handover reports, chat images, multi-region terms PDFs (per migrations). Files may contain identity-related content.

### 2.6 Handover & tenant flows

- **Tables:** `listing_tenant_tokens`, handover report flows, RPCs for signatures.
- **Purpose:** Tenant/landlord/kommune coordination; tokens are personal-data-bearing if linked to individuals.

### 2.7 Audit & compliance

- **Table:** `audit_logs` (kommune visibility policies in multiple migrations).
- **Content:** `user_id`, `action_type`, `listing_id`, `listing_address`, `details` — operational and accountability logging.

### 2.8 Access control

- **Table:** `kommune_access_list` (whitelist) and related policies.

### 2.9 Push

- **Table:** `push_subscriptions` — subscription JSON/endpoints for web push.

### 2.10 Technical / automatic

- IP addresses, User-Agent, Supabase/Edge logs, webhook delivery logs, Signicat/BankID transaction metadata (depending on configuration).

---

## 3. Processing purposes (functional)

1. **User accounts** — registration, login (email/password, BankID via Signicat OIDC).
2. **Role-based access** — kommune vs utleier vs admin; RLS enforcement.
3. **Property mediation** — listings, reservations, kommune workflows.
4. **Messaging** — chat between landlords and kommune (and configured peers).
5. **Notifications** — in-app + optional email + push.
6. **Electronic signing** — terms/handover via Signicat Sign API (`sign-agreement`, `sign-callback`).
7. **Document storage** — PDFs and images in Supabase Storage.
8. **Audit & security** — `audit_logs`, abuse investigation.
9. **Operational email** — Mailjet REST API or SMTP (e.g. Mailjet relay) from Edge Functions.

---

## 4. Third parties (sub-processors) — technical

| Service | Role | Evidence |
|---------|------|----------|
| **Supabase** | Hosting DB, Auth, Storage, Edge Functions | Project URL, migrations, `supabase/` |
| **Signicat** | BankID OIDC + document signing API | `auth-signicat`, `sign-agreement`, `SECRETS_CONFIGURATION_GUIDE.md` |
| **Mailjet** | Transactional email | Edge secrets `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `NOTIFICATION_FROM_EMAIL` and/or `SMTP_*` |
| **SMTP provider** (optional) | Transactional email | `SMTP_*` secrets |
| **Hosting** (e.g. Vercel) | Next.js deployment | Env var docs / team practice — **confirm** |
| **Apple / Google** (if native stores) | App distribution only | `MOBILE_APP_STORE_GUIDE.md` — not processors of app content by default |

**Database webhooks:** `notifications` INSERT → `send-push` / `send-notification-email` (see `SECRETS_CONFIGURATION_GUIDE.md`).

---

## 5. Security measures (observed in design)

- **RLS** enabled on `profiles` and extended across tables (kommune policies, whitelist, etc.).
- **Anon key** in browser; **service_role** only server-side for webhooks/automation.
- **TLS** for HTTPS traffic to Supabase and APIs (standard).
- **Cascade delete** from `auth.users` linked in `20250231000000_auth_users_cascade_delete.sql` (verify full coverage for messages, storage objects, audit).

---

## 6. Gaps to close (non-technical list; technical work later)

- **Retention schedules** per table/category (questionnaire).
- **Named controller** and any **joint controllership** (questionnaire).
- **International transfers:** Supabase region + Mailjet/Vercel/Signicat — **document** SCCs/DPF/TIA per vendor.
- **Cookie banner** if non-essential cookies are added (`personvern` section 7 placeholder).
- **Account deletion** UX and backend completeness (`PRIVACY_DATA_COLLECTION.md` already flags).

---

## 7. Change control

When you add analytics, CRM, error tracking (Sentry), or new storage:

1. Update this file and **RECORD_OF_PROCESSING_ACTIVITIES.md**.
2. Update **SUBPROCESSORS_AND_TRANSFERS.md** and sign DPAs.
3. Update privacy notice and, if needed, cookie consent.
