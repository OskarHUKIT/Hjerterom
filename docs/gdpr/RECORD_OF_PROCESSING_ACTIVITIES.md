# Record of processing activities (Article 30 GDPR)

**Controller:** Each **participating kommune** (customer) for processing in connection with its **boligformidling** in Boly — see published list (intended: `bolynorge.no/behandlingsansvarlige`) and in-app context.  
**Processor:** **GameChanging AS**, org.nr. 932496321, Lavangsnesveien 2039.  
**Last updated:** 2026-04-10  
**Version:** 1.0 (draft for counsel)

*Each kommune should hold or adopt this register for its processing; GameChanging maintains processor documentation in parallel.*

---

## Register (Boly — filled from stakeholder questionnaire)

| ID | Activity | Purpose | Lawful basis (Art. 6) | Data subjects | Recipients / subprocessors | Transfers outside EEA | Retention (policy) | Security (summary) |
|----|----------|---------|------------------------|---------------|----------------------------|------------------------|---------------------|---------------------|
| P1 | Registration & auth (email/password) | Accounts | (b) | Utleiere, kommuneansatte | Kommune, GameChanging, Supabase | See vendor DPAs | Active account + see §D | TLS, RLS |
| P2 | BankID (optional) | Strong login | (b)(c) | Users opting in | Signicat, Supabase | Assess SCC/DPF | Session + logs per policy | Edge Functions, secrets |
| P3 | Profiles & roles | Access control | (b)/(e) by role | All users | Supabase | As above | Account lifetime + 12m rules | RLS |
| P4 | Listings & mediation | Formidling | (b) landlord; (e) kommune | Utleiere, leietakere ev., kommune | Kommune staff, Supabase | As above | 12m after close (policy) | RLS, whitelist |
| P5 | Messaging | Kommunikasjon | (b) + (e) | Utleiere, kommune | Thread participants | Supabase | 12m | RLS; sensitive-data UI hint |
| P6 | In-app notifications | Varsler | (b)/(e) as applicable | All | Supabase | — | Operational + 12m context | Internal |
| P7 | E-postvarsler | Duplicate to e-mail | (a) opt-in | Opt-in users | Mailjet (SMTP) | Assess EU/US per Mailjet DPA | 12m policy alignment | TLS, consent flag |
| P8 | Push | Web push | (a) | Opt-in | Supabase Edge | — | Until unsubscribe | VAPID |
| P9 | E-signing (vilkår m.m.) | Bevis / avtale | (b) | Signers | Signicat | Assess | Per archive + 12m context | Sign API |
| P10 | Storage (PDF, bilder) | Dokumenter | (b)/(e) | Uploaders | Supabase Storage | — | Linked to P4/P5 retention | Buckets, RLS |
| P11 | Tenant tokens / overlevering | Flyt | (b)/(e) | Leietaker, utleier | Kommune | Supabase | Per policy | Tokens, expiry |
| P12 | Audit logs | Ansvarlighet | (e)(c) | Relevante brukere | Kommune admin | Supabase | 12m | Restricted read |
| P13 | Infra logs | Drift/sikkerhet | (f) / (e) — **confirm** | Users | Vercel, Supabase | US/global — **TIA** | Vendor defaults | Access control |
| P14 | Plattformdrift (`/ops`) | Roller, sentral vilkårsgodkjenning, aggregert statistikk | (f) berettiget interesse / Art. 28 instruks | GameChanging operatører (`platform_operators`) | Supabase (samme region) | EU | 12m audit_logs | RLS + RPC, maskert e-post i lister, OPS_* audit |

**Art. 9:** Not intentional; accidental chat content — policy + requests.

---

## Systems

| System | Function |
|--------|----------|
| Supabase (eu-central-1) | DB, Auth, Storage, Edge Functions |
| Vercel | Next.js hosting |
| Mailjet | Transactional e-mail (SMTP) |
| Signicat | BankID + signing |

---

## Review

**Quarterly** or on material change (new vendor, region, feature).
