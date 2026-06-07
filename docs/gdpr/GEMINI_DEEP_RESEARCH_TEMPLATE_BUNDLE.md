# Boly — Gemini Deep Research bundle (templates + context)

**Purpose:** One package for **Gemini Deep Research** (or similar) to generate **professional, contract-grade** document templates exportable to **Google Docs**, plus **human guidance** for definitions, fill-in instructions, and legal considerations.

**Disclaimer:** This file synthesises the Boly codebase and internal GDPR drafts. It is **not legal advice**. All templates require **Norwegian counsel** and, where relevant, **kommune** DPO sign-off before signature or reliance.

**Last updated:** 2026-04-15

---

## Part A — How to use this bundle

1. **Read** Part B (system description) and Part D (pre-filled schedules) yourself so you know what is fixed vs placeholder.
2. **Copy** Part F (the master prompt) into Gemini Deep Research in full, or split into one prompt per deliverable if the tool limits length.
3. **Attach** or paste Part B + Part D when the tool allows file context (recommended).
4. **Export** Gemini outputs to Google Docs; apply your **house style** (fonts, heading numbering, page headers with document ID/version).
5. **Redact** before sharing externally: remove internal phone numbers or personal e-mails if you paste this file into a public tool.

---

## Part B — Very detailed description of Boly (for researchers and models)

### B.1 Product identity and positioning

**Boly** (also referred to in materials as **Boligbanken** in a housing-bank context) is a **Norwegian digital platform** for **social housing mediation** (*sosial boligformidling*). It connects **municipalities (kommuner)** that need to place people in housing with **private landlords (utleiere / boligeiere)** who offer homes, and supports workflows around **listings**, **communication**, **documentation**, and **electronic signing**.

**Commercial / delivery model (documented intent):**

- **GameChanging AS** (Norwegian limited company) builds and operates the software and infrastructure as **databehandler** (processor) under **Article 28 GDPR**, on instructions from **kommuner** that act as **behandlingsansvarlig** (controllers) for processing tied to each kommune’s **boligformidling** mission.
- End-user transparency is intended to combine: (1) a **published list** of controllers (kommuner), and (2) **in-app** indication of the relevant kommune where the product ties the user to a municipality.

**Public-facing properties (documented):**

- Primary production web: `https://www.bolynorge.no`  
- Alternate / deployment URL noted in internal docs: `https://boly-pi.vercel.app`  
- Privacy contact (processor line, to confirm in operations): `info@bolynorge.no`  
- Intended URL for controller list: `bolynorge.no/behandlingsansvarige` (implementation status: verify in production; spelling may vary in drafts — pick one URL and redirect)

### B.2 User roles and functional scope

| Role (practical) | Typical capabilities (high level) |
|------------------|-------------------------------------|
| **Utleier / boligeier (homeowner / landlord)** | Register; manage **listings** (housing offers); optional **BankID** authentication; **sign terms** (vilkårsavtaler) with **BankID via Signicat**; receive/require notifications; **messaging** with kommune; access flows related to **handover / tenant** reporting where implemented. |
| **Kommune staff (saksbehandler)** | Access listings and users per **region/whitelist** policies; **read/write** per profile flags (e.g. `kommune_can_edit`); messaging; notifications; administrative views as implemented. |
| **Kommune admin** | Broader kommune administration: user/region scope; **terms documents** workflow (upload PDFs; **central approval** gate before documents apply to landlord signing — `approved_for_utleier_signing`); audit visibility where policy allows. |
| **Leietaker / tenant (where applicable)** | Token-based or guided flows (e.g. handover) — see RoPA for tenant tokens. |

**Core functional areas reflected in architecture:**

- **Authentication:** Supabase Auth; optional **BankID** via **Signicat** OIDC; session cookies (strictly necessary) for auth token.
- **Listings:** Property listings with mediation-related fields; kommune-scoped visibility via RLS and whitelist patterns.
- **Messaging:** Chat between landlords and kommune; **e-mail duplicate** notifications **opt-in** (`email_notifications_enabled` on profiles).
- **Notifications:** In-app notifications; optional **web push** (VAPID); e-mail via **Mailjet** (REST API in Edge Functions, SMTP fallback).
- **Terms & e-signing:** Versioned **terms documents** (PDF in storage, metadata in DB); **Signicat Sign API** for signing; callbacks sync acceptance records; **regional** and **global** terms logic (kommune regions).
- **Documents & storage:** PDFs (terms, handover, etc.) in **Supabase Storage**; public or authenticated paths per policy.
- **Audit:** `audit_logs` for security and accountability (kommune-visible under policy).
- **GDPR-oriented features:** Data subject request handling described as **manual export** from Supabase (roadmap: optional in-app export).

### B.3 Technical architecture (accurate to repository)

| Layer | Technology | Privacy/security notes |
|-------|------------|-------------------------|
| **Web application** | **Next.js** (App Router), React, TypeScript | Server and client components; environment variables for public Supabase keys only. |
| **Hosting (frontend)** | **Vercel** (typical) | CDN, request logs; **DPA** with Vercel; possible **non-EEA** processing — Chapter V assessment in legal docs. |
| **Backend** | **Supabase**: PostgreSQL, Auth, Row Level Security, Storage, **Edge Functions** (Deno) | Primary application database; **RLS** on sensitive tables; **service_role** only server-side. |
| **Region (documented)** | Supabase project **eu-central-1** (Frankfurt) — **confirm in live dashboard** | Reduces latency vs US DB; still assess vendor corporate transfers. |
| **E-mail** | **Mailjet** transactional (REST **v3.1 send** from Edge Functions; **SMTP** optional fallback) | Message content and recipient addresses leave to Mailjet; DPA on Mailjet account. |
| **Identity & signing** | **Signicat**: OIDC for BankID login; **Sign API** for document signing | Sub-processor; signing evidence and metadata — align with kommune archive needs. |
| **Push** | Web Push with **VAPID** | Subscription data in `push_subscriptions`; consent at enable. |

**Operational security (documented internal posture):**

- **RLS** enforced for tenant isolation; kommune access bounded by role and region logic.
- **Secrets** in Supabase Edge Function secrets (not client bundle).
- **Incident response:** Named internal first responder and management escalation in `COMPLIANCE_MASTER.md` (verify current before contracts).
- **Monitoring:** Not claimed as 24/7 vendor page monitoring; reliance on alerts and suspicion.

### B.4 Data categories and processing purposes (summary)

Align with **Record of Processing Activities** (Article 30) in-repo:

- **Identity & account:** e-mail, profile name, role, kommune region, locale preferences.
- **Housing / listing data:** addresses, descriptions, pricing, availability, mediation notes — **may identify** landlords and indirectly tenants.
- **Messaging content:** free text — **risk** of accidental special categories; mitigations: UI warnings, training, SAR handling.
- **Notifications & audit:** operational metadata, action types, user linkage.
- **Signing:** agreement versions, timestamps, Signicat session linkage (per implementation).
- **Files:** PDFs and images in Storage (terms, handover, chat images where enabled).

**Lawful basis (draft — kommune counsel must validate):** mix of **contract (Art. 6(1)(b))**, **public task / official authority (e)** for kommune staff flows where applicable, **consent (a)** for optional e-mail and push, **legal obligation / vital interests** only where counsel assigns — see `LAWFUL_BASIS_MATRIX.md` and questionnaire.

### B.5 Retention and deletion (policy stated in internal drafts — implement vs reality)

| Area | Policy figure in drafts | Implementation note |
|------|-------------------------|------------------------|
| Listings/messages/docs (post-close context) | **12 months** | Must align with **kommune archive / journal** law — may override. |
| Messages | **12 months** | Same caveat. |
| Audit logs | **12 months** | Same caveat. |
| Backups | **6 months** restore window stated | **Reconcile** with Supabase backup defaults. |

### B.6 International transfers

Even with **EU** database region, **US-linked** vendors (e.g. Vercel, Supabase corporate, elements of other stacks) may require **SCCs / DPF / TIA** — legal completion required; not purely technical.

### B.7 Features with compliance sensitivity (for DPIA / contracts)

- **BankID** and **qualified signing** — strong identity assurance; data minimisation vs audit needs.
- **Kommune–landlord messaging** — confidentiality, access scope, monitoring disclaimers.
- **E-mail duplication of in-app content** — opt-in; content may be large (message body in notification — disclose in privacy notice).
- **Central approval of terms PDFs** before they bind landlords — governance clause in DPA / operational appendix.
- **Whitelist / region** enforcement — data minimisation for which kommune staff see which landlords.

### B.8 What Boly is *not* (avoid over-claiming)

- Not a substitute for **kommune** statutory duties or individual **journalføring** decisions — allocate in governance.
- Not guaranteed **24/7** SOC unless contractually agreed.
- **Analytics / marketing** tools: stated as **none** in drafts — if added later, update DPAs and cookie posture.

---

## Part C — Suggested output documents (for Gemini to generate)

Ask Gemini to produce **separate** Google-Docs-ready templates (each with title page placeholders, version table, signature blocks):

1. **Databehandleravtale (Article 28)** — kommune (controller) ↔ GameChanging AS (processor) — Norwegian law, GDPR Article 28 clauses, annexes for instructions, security, sub-processors, transfers, audit, breach, deletion/return.
2. **Vedlegg: Databehandlerinstruks** — standard instructions template (can be schedule to DPA).
3. **Vedlegg: Register over underleverandører (sub-processors)** — living table with Mailjet, Supabase, Vercel, Signicat; change mechanism.
4. **Tjenesteleveranseavtale / SaaS-vilkår** (commercial + SLA light) — if distinct from pure DPA in your practice — **optional**; counsel decides split.
5. **Personvernerklæring / personverninformasjon** — website/app layered notice (Norwegian), with technical annex for cookies.
6. **DPIA** — full template aligned with Datatilsynet practice, referencing Boly processing.
7. **Rutine for behandling av registrertes rettigheter** (SAR, deletion, objection) — internal + interface to kommune as controller.
8. **Rutine ved personvernbrudd** — 72-hour assessment workflow, kommune notification, Datatilsynet escalation.
9. **Avtale om felles behandling / instruks** — only if counsel ever needs joint controller wording (currently **not** selected in master doc — include only as optional annex).
10. **NDA / confidentiality** — for kommune staff or pilots (optional).

**Formatting instructions for Gemini:** Use **clear heading hierarchy (H1–H3)**, **numbered clauses** where typical for Norwegian contracts, **Schedules / Vedlegg A–E**, **defined terms** section, and **highlight placeholders** like `[KOMMUNE_NAVN]`, `[ORG_NR]`, `[DATO]`, `[KONTAKTPERSON_DPO]`.

---

## Part D — Information already available to pre-fill (verify before locking)

### D.1 Processor (GameChanging AS) — from internal compliance master

| Field | Value (verify) |
|-------|----------------|
| Legal name | **GameChanging AS** |
| Organisation number (org.nr.) | **932496321** |
| Address | **Lavangsnesveien 2039** |
| Privacy / operational inbox (stated) | **info@bolynorge.no** |
| Technical / security contact (named in master) | **Oskar Høgmo-Utstøl** — `oskar@gamechanging.no`, **+46 70 149 09 81** |
| Management contact (named for serious incidents) | **Lars Utstøl** (daglig leder) |

*Redact or replace contacts in templates if roles change.*

### D.2 Digital service identifiers

| Field | Value |
|-------|--------|
| Production URL(s) | `https://www.bolynorge.no`, `https://boly-pi.vercel.app` |
| Supabase region (documented) | **eu-central-1** (Frankfurt) |
| Supabase project ref (dashboard) | `ayddwbmkclujefnhsaqv` |
| Intended controller list URL | `https://bolynorge.no/behandlingsansvarige` (confirm live; align with `COMPLIANCE_MASTER.md`) |
| Production data copied to dev | **No** (per questionnaire — verify ongoing) |

### D.3 Sub-processors (core list — update DPAs and registration dates in annex)

| Sub-processor | Role | Notes for annex |
|---------------|------|-----------------|
| **Supabase** | DB, Auth, Storage, Edge Functions | Region eu-central-1; DPA: `https://supabase.com/legal/dpa` |
| **Vercel** | Frontend hosting | DPA: `https://vercel.com/legal/dpa` |
| **Mailjet** | Transactional e-mail | API + optional SMTP; Mailjet DPA on account |
| **Signicat** | BankID OIDC + e-signing | Contract-specific |

**Deprecated:** Resend — remove from live secrets and legal annexes if fully migrated.

### D.4 Policy numbers (draft — legal must align with kommune archive law)

| Topic | Draft figure |
|-------|----------------|
| Retention (listings/messages/docs context) | 12 months |
| Messages | 12 months |
| Audit logs | 12 months |
| Backups restore window (stated) | 6 months |

### D.5 Lawful basis summary (non-exhaustive — counsel validates)

| Processing | Draft basis (Art. 6) |
|------------|----------------------|
| Landlord accounts & listings | (b) contract |
| Kommune staff processing | (e) public task — **verify** |
| Optional e-mail / push | (a) consent |
| BankID / signing | (b), (c) as applicable — **verify** |

### D.6 Security and cookies (minimum documented)

| Item | Detail |
|------|--------|
| Session cookie (example name) | `sb-ayddwbmkclujefnhsaqv-auth-token` (verify after upgrades) |
| Non-essential marketing/analytics | **None** planned in drafts |

### D.7 Controller side (each kommune) — **must be filled per customer**

| Field | Placeholder |
|-------|-------------|
| Kommune name | `[KOMMUNE_NAVN]` |
| Org.nr. | `[KOMMUNE_ORG_NR]` |
| Address | `[KOMMUNE_ADRESSE]` |
| DPO / privacy contact | `[KOMMUNE_DPO_NAVN, EPOST, TELEFON]` |
| Signatory title | `[ORDFØRER / RÅDMANN / DELEGERT]` — counsel decides |

---

## Part E — Definitions (for template glossary)

Use a **Definitions** clause in each contract template. Recommended terms (Norwegian + English in parentheses where useful):

| Term | Short definition for documents |
|------|----------------------------------|
| **Personopplysning** | Any information relating to an identified or identifiable natural person. |
| **Behandling** | Any operation on personal data (collection, storage, disclosure, erasure, etc.). |
| **Behandlingsansvarlig** | Entity that decides purposes and means (here: **kommune** for its mediation processing). |
| **Databehandler** | Entity processing on behalf of controller (here: **GameChanging AS**). |
| **Underleverandør (sub-processor)** | Processor’s vendor further processing personal data. |
| **Databehandleravtale (DPA)** | Article 28 agreement. |
| **RoPA** | Record of processing activities (Article 30). |
| **DPIA** | Data protection impact assessment (Article 35). |
| **TIA** | Transfer impact assessment for third-country transfers. |
| **Tjenesten** | The Boly platform as hosted from time to time. |

---

## Part F — Master prompt for Gemini Deep Research (copy below this line)

```
You are assisting Norwegian legal and compliance work for a software supplier and its municipal customers. Generate professional, contract-grade document TEMPLATES in Norwegian (Bokmål) suitable for export to Google Docs. Do NOT invent statutory citations without marking them for verification. Mark all business-specific facts with clear placeholders like [KOMMUNE_NAVN], [DATO], [VEDTAKS_MYNDIGHET].

CONTEXT — PRODUCT “Boly” (Boligbanken)
Boly is a digital platform for Norwegian municipal social housing mediation: connecting municipalities (kommuner) with private landlords, supporting listings, messaging, notifications, document storage, BankID login via Signicat (OIDC), electronic signing of terms (Signicat Sign API), optional web push, and e-mail notifications via Mailjet. Frontend is Next.js on Vercel; backend is Supabase (PostgreSQL + Auth + Storage + Edge Functions) in eu-central-1; Row Level Security applies. GameChanging AS (org.nr. 932496321, Lavangsnesveien 2039) acts as processor (databehandler) for municipalities as controllers (behandlingsansvarlige) for their boligformidling. Privacy contact: info@bolynorge.no. Production: bolynorge.no. Sub-processors include Supabase, Vercel, Mailjet, Signicat. Retention policy drafts: 12 months for several categories; backups stated 6 months — must align with kommune archive law. International transfers may require SCCs/TIA for US-linked vendors.

TASK
Produce the following deliverables as separate sections, each ready to paste into Google Docs:

1) DATABEHANDLERAVTALE (Article 28 GDPR) between [KOMMUNE] and GameChanging AS — full clause structure: subject matter, duration, nature and purpose, types of data subjects and data categories, controller instructions, confidentiality, security (ref. Art. 32), assistance with rights and DPIA, subprocessors and prior authorisation / general authorisation with named list, data breach notification, deletion/return, audit, liability cap placeholders, governing law NO, venue, change control, signatures.

2) VEDLEGG A: Standard databehandlerinstruks (template).

3) VEDLEGG B: Underleverandørliste with columns: Navn, Tjeneste, Behandling, Region, Lenke til DPA, Merknad — pre-filled rows for Supabase, Vercel, Mailjet, Signicat with footnote to verify registration.

4) PERSONVERNERKLÆRING for bolynorge.no — layers: summary, full text, rights, cookies (session auth), transfers, contact — placeholders for kommune-specific wording where needed.

5) DPIA-mal aligned with Datatilsynet expectations: description, necessity, risks table with mitigations, residual risk, consultation, sign-off — tailored to Boly features (BankID, messaging, e-mail duplication opt-in, audit logs).

6) Intern rutine: behandling av innsyn/sletting — roles of kommune vs GameChanging, SLA placeholders (e.g. 3 days acknowledge / 30 days respond), identity verification.

7) Intern rutine: personvernbrudd — 72h assessment, documentation, kommune notification, Datatilsynet threshold.

For EACH deliverable include:
- A short “Slik bruker du dette dokumentet” box (how to fill placeholders, approval order, version control).
- A “Definisjoner” mini-glossary cross-referencing Article 28/30/32/33 where relevant.
- A “Vurderinger for jurist” checklist (TIA, kommune journal law override, marketing tools if added later, Signicat DPA, Mailjet DPA, Vercel/Supabase DPAs).

STYLE REQUIREMENTS
- Norwegian Bokmål, formal legal-administrative tone, suitable for municipalities.
- Numbered clauses; schedules; defined terms; signature blocks for two parties.
- Explicit [PLACEHOLDER] fields rather than guessed facts.
- Note where **kommune** as controller must take independent legal decisions (arkiv/journal, offentlighetsloven, etc.).
- Do not assert that GameChanging is “behandlingsansvarlig” for end-users — preserve controller/processor split described above.

OUTPUT FORMAT
- Use Markdown headings so the user can convert to Google Docs.
- Start each major document with TITLE, VERSION [0.1 MAL], DATE [____].
```

---

## Part G — Considerations (for humans and counsel)

1. **Controller vs processor:** Norwegian municipalities often have **strong archive and transparency laws** — retention clauses in SaaS DPAs must **defer** or **explicitly allow** kommune instructions that extend retention where statute requires.
2. **Joint controllership:** Master documentation currently assumes **not** joint controllers — if any kommune demands joint control, **do not** use standard DPA without counsel rewrite.
3. **Signicat and BankID:** Contractual allocation of **evidence** for signed agreements (vilkår) and **availability** for legal holds.
4. **Message content in e-mail:** If notifications include message bodies, **purpose limitation** and **transparency** in privacy notice must match reality.
5. **Whitelist / region access:** DPA should reflect **technical** access boundaries (RLS, kommune regions) without over-promising impossible guarantees.
6. **US transfers:** Vercel/Supabase — keep **TIA/SCC** placeholders and vendor DPA references current.
7. **Children / vulnerable users:** If relevant to mediation, address in DPIA — do not assume solely from this bundle.
8. **Export to Google Docs:** After import, run **spelling**, **heading styles**, and **table of contents**; lock **placeholder** formatting (e.g. yellow highlight) for legal team.

---

## Part H — Version control

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-04-15 | Repo synthesis | For Gemini handoff; verify contacts and URLs before production use |

---

## Part I — Information pack (feed this to Gemini with the revision prompt)

Use **Part I.1** as factual constraints. Use **Part I.2** as the change list. Paste the **full original document** to be revised in the same chat (or attach as file).

### Part I.1 — Boly facts (verify before locking; not legal advice)

| Topic | Content |
|--------|---------|
| Product | **Boly** (also *Boligbanken* in materials): digital platform for **sosial boligformidling** — connects **kommuner** with **private utleiere**; listings, messaging, notifications, document storage, **BankID** via **Signicat**, **e-signing** of terms, optional **web push**, **e-mail** via **Mailjet**. |
| Processor | **GameChanging AS**, org.nr. **932496321**, **Lavangsnesveien 2039**. |
| Controller | Each **kommune** (customer) for processing in its **boligformidlingsoppdrag** — **not** GameChanging for end-user processing. |
| Production URLs | `https://www.bolynorge.no`, alternate `https://boly-pi.vercel.app`. |
| Privacy inbox (stated) | **info@bolynorge.no** |
| Intended controller list URL | `https://bolynorge.no/behandlingsansvarige` (confirm spelling/live deployment). |
| Supabase region | **eu-central-1** (Frankfurt) — primary DB/Auth/Storage. |
| Stack | **Next.js** on **Vercel**; **Supabase** (PostgreSQL, Auth, Storage, Edge Functions); **Signicat** (BankID OIDC + Sign API); **Mailjet** (transactional e-mail, REST API preferred over legacy Resend). |
| Isolation | **Row Level Security (RLS)** plus **role/region/whitelist** patterns — kommune staff only see data their policies allow (not only “all data in one kommune” — be precise). |
| Terms of use | **Versioned vilkårsdokumenter** (PDF in Storage); signing via Signicat; **sentral godkjenning** may apply before a document is offered for **utleier** BankID-signering (`approved_for_utleier_signing` — governance between kommune upload and production use). |
| Optional processing | **E-postvarsler** duplicate in-app notifications — **opt-in** via profile flag (`email_notifications_enabled`). **Push** — opt-in at enable. Do **not** describe these as purely Art. 6(b). |
| BankID | Strong authentication for signing and login flows; **do not** state that BankID is universally *obligatorisk for all users* unless product policy explicitly requires it — acknowledge **e-post/annen innlogging** where applicable. |
| MFA | If mentioned, frame as **organisational** requirement or **future** product control unless counsel confirms app-wide enforcement for all kommune users. |
| Encryption | Prefer wording: data **in transit** TLS; **at rest** per **Supabase/hosting** standards — avoid over-specific AES claims unless cited from vendor docs. |
| Sub-processors (core) | **Supabase**, **Vercel**, **Mailjet**, **Signicat** — each needs DPA/TIA consideration; **US-linked** vendors may need **SCC/DPF/TIA** even when DB is in EU. |
| Retention (policy drafts in internal docs) | Often **12 months** for several categories — **kommune arkiv/journal** may **override**; backups stated **6 months** — reconcile with vendor reality. |
| SAR / export | Internal posture: **manual** export from Supabase for data subject requests; **kommune** decides refusals where **arkiv** applies. |
| Special categories (Art. 9) | Not systematically processed; **chat** free text may accidentally contain sensitive info — mitigations: UI warning, training, case-by-case handling. |
| Cookies | Session auth cookie (Supabase) — **no** non-essential marketing/analytics in current draft posture (re-verify if scripts added). |

**RoPA-style activities to reflect in annexes (headlines):** registrering/profil; BankID; annonser/formidling; meldinger; varsler (in-app); **e-postvarsler (samtykke)**; push (samtykke); vilkår/signering; Storage/dokumenter; leietaker/overtakelse/token; **revisjonslogger**; driftslogger.

### Part I.2 — Required revisions (what was weak in the first draft)

1. **Art. 28 DPA:** Expand clauses: **documented instructions**, **sub-processor** objection/authorisation (not only 30-day notice), **return/deletion** at end, **audit**, **assistance** with DPIA and rights, **breach** timing (controller **without undue delay**; align **72h** authority notification where relevant — do not invent fixed **48h** without labelling as **contractual SLA**).  
2. **Lawful basis:** Explicit **samtykke** for optional e-mail/push; nuanced **(b) vs (e)** for landlord vs kommune; **Art. 9** disclaimer for chat.  
3. **Transfers:** Separate **primary storage EU** from **edge/CDN/US corporate** processing — **SCC/TIA** placeholders.  
4. **DPIA:** Soften “obligatorisk BankID”; add **e-post-innhold i varsel**, **sentral godkjenning av vilkår**, **whitelist/region**.  
5. **Arkiv:** Keep tension with GDPR but avoid implying a **specific** archive product is mandatory — **Elements/P360** as examples only.  
6. **Statutes:** Flag **helse- og omsorgstjenesteloven** / **boligsosial lov** — **verify** exact titles and citations with jurist; use placeholders if uncertain.  
7. **Add** short sections or annex pointers: **personverninformasjon**, **rutine for registrertes rettigheter**, **personvernbrudd** (if missing).  
8. **Tone:** Remain **Bokmål**, **formal**, suitable for **kommune**; mark all unverified legal claims with **[VERIFISER MED JURIST]**.

---

## Part J — Prompt for Gemini: revise the integrated framework document

**Copy everything inside the fence below** into Gemini (with the original full text pasted above or attached). Optionally attach this file’s **Part B**, **Part D**, **Part I.1** for extra context.

```
You are a Norwegian legal-technical editor. Your task is to REVISE and EXPAND the user-supplied document titled (approximately) «Integrert rammeverk for etterlevelse og styring for Boly-plattformen» — a framework text that includes regulatory introduction, technical architecture, a DPA template, annexes, archive discussion, and a DPIA table.

INPUTS YOU HAVE
1) The full SOURCE DOCUMENT from the user (paste below).
2) The following CONSTRAINTS and FACTS about the Boly platform (must align prose and annexes with these facts unless marked as placeholder):

[FACTS — integrate accurately]
- Boly/Boligbanken: kommunal boligformidling; GameChanging AS org.nr. 932496321 is processor (databehandler); each kommune is controller for its processing.
- Stack: Next.js on Vercel; Supabase (PostgreSQL, Auth, Storage, Edge Functions) region eu-central-1; Signicat for BankID + signing; Mailjet for transactional e-mail.
- Security: RLS and role/region/whitelist patterns — describe without claiming impossible guarantees.
- Optional e-mail and push notifications require consent (Art. 6(1)(a)) where applicable; in-app notifications may rest on other bases — use nuanced wording and [JURIST] notes.
- Terms: PDF storage + Signicat signing; central approval may apply before landlord-facing signing — mention as governance/instruction topic.
- Transfers: EU primary DB does not remove need to assess US-linked vendors (Vercel, etc.) — SCC/TIA placeholders.
- Retention: internal drafts mention ~12 months for several areas — kommune archive law may override; backups ~6 months — [VERIFY].
- Do not state BankID is mandatory for all users unless source document proves it; allow email/password where relevant.
- Do not assert MFA is enforced in-app for all staff unless stated as organisational policy.
- RoPA-style coverage: registration, listings, messaging, notifications, email duplicate (consent), push (consent), terms/signing, storage, tenant/handover tokens, audit logs, operational logs.
- Privacy contact: info@bolynorge.no (processor line — confirm operational).

REVISION TASKS
A) Preserve the document’s overall narrative and professional tone (Norwegian Bokmål, suitable for kommuner). Reorganise only if it improves clarity.
B) Strengthen the DPA template (Art. 28): add missing typical clauses — duration/end of processing, return/deletion of data, documented instructions and changes, sub-processor mechanism (including objection where appropriate), assistance with rights and DPIA, audit, international transfers, liability placeholders — without fabricating Norwegian statute text; use [PLACEHOLDER] and [VERIFISER MED JURIST].
C) Expand Vedlegg A (instructions) with Boly-specific processing and governance (vilkår, regions, audit logs, optional channels).
D) Update Vedlegg B (sub-processors): align roles; add note on DPA links and change management; EU/US nuance.
E) Rewrite the DPIA section: risk table + short narrative on necessity, proportionality, residual risk, consultation Art. 36 if needed — fix overstated claims (BankID, MFA, encryption).
F) Add concise new sections OR clear cross-references where gaps exist: transparency/personverninformasjon (pointer), registrertes rettigheter (rutine outline), personvernbrudd (controller notification without undue delay; authority notification where required — use careful wording).
G) Archive section: keep the GDPR vs arkivloven tension; avoid mandating one specific archive software; keep export recommendation as example.
H) Add a final checklist: «For jurist — før signering» covering TIA, subprocessors, lawful basis table, and statute citations.

OUTPUT
- Return the FULL revised document in Markdown.
- Use clear headings consistent with the original.
- Start with a short «Endringslogg» bullet list (max 15 bullets) summarising what you changed.
- Mark all uncertain legal points with [VERIFISER MED JURIST] or footnote-style **Merk:**.

SOURCE DOCUMENT (paste the complete original text below this line):
[PASTE USER DOCUMENT HERE]
```

---

**End of bundle**
