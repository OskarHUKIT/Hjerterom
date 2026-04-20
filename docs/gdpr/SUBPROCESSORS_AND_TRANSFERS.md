# Sub-processors, Article 28, and international transfers — Boly

**Last updated:** 2026-04-10  
**Processor:** GameChanging AS (toward kommune controllers)

---

## 1. Sub-processor register (living list)

| Sub-processor | Service | Personal data (categories) | Region / note | DPA / terms |
|---------------|---------|-----------------------------|---------------|-------------|
| **Supabase** | DB, Auth, Storage, Edge | All application personal data | DB **eu-central-1** (confirm in dashboard) | https://supabase.com/legal/dpa |
| **Vercel** | Next.js hosting, CDN, logs | IP, requests, deploy metadata | Global; US entity | https://vercel.com/legal/dpa |
| **Mailjet** | Transactional e-mail (SMTP) | E-mail addresses, message content | EU-focused — confirm in Mailjet account | Mailjet DPA (account) |
| **Signicat** | BankID OIDC, e-signing | Identity/signing metadata | Per contract/region | Vendor DPA |

**Deprecated / do not use in prod if migrated:** Resend — remove secrets and references.

**Note:** Questionnaire section E once said “no sub-processors” — that is **incorrect** as a global statement; the table above is the operational truth. If the intent was “no *unlisted* subprocessors,” document only **approved** vendors.

---

## 2. International transfers (Chapter V)

**US-linked providers** (Vercel, Supabase corporate, parts of stacks): rely on **appropriate safeguards** — typically **SCCs**, **DPF** where certified, plus **TIA** where required.

**Actions for counsel:**

- [ ] File executed **DPAs** where available.  
- [ ] Complete **TIA** for each US-tied processing chain.  
- [ ] List mechanisms in **personvernerklæring** § on transfers.

---

## 3. Article 28 checklist (kommune ↔ GameChanging)

Use [Datatilsynet checklist](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/hvordan-lage-en-databehandleravtale/hva-ma-en-databehandleravtale-inneholde/):

- [ ] Subject matter, duration, nature, purpose, data categories, instructions  
- [ ] Confidentiality; security (Art. 32); subprocessors; assistance on rights and breaches  
- [ ] Delete/return at end; audit  

---

## 4. Onward transfers

Approve **Supabase** / **Mailjet** subprocessors per their lists or contract change process.
