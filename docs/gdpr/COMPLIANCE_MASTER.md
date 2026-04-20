# Boly / Boligbanken — GDPR compliance package (master)

**Purpose:** Single export-oriented description of governance, processing, routines, and open items. **Must be reviewed by legal counsel** before reliance in contracts or regulatory filings.

**Document version:** 1.0  
**Source:** `STAKEHOLDER_QUESTIONNAIRE.md` (completed), codebase inventory, `TECHNICAL_ANALYSIS.md`.  
**Last updated:** 2026-04-10

---

## 1. Disclaimer

- This is **not legal advice**.  
- **Behandlingsansvarlig** for end-user processing in each kommune’s mediation mission is the **kommune** (see §2). **GameChanging AS** acts as **databehandler** under written agreement.  
- Reconcile **§7.2** with counsel: questionnaire section E once stated “no sub-processors” while section F lists vendors — **actual subprocessors must be listed** (see §5).

---

## 2. Roles & definitions

| Term | Meaning (practical) |
|------|---------------------|
| **Behandlingsansvarlig (controller)** | Decides **why** and **for whose mission** personal data is processed. Here: **each participating kommune** for processing in connection with its **boligformidling** in Boly. |
| **Databehandler (processor)** | Processes data **on the controller’s instructions**. Here: **GameChanging AS** (platform, hosting path, operations). |
| **Personopplysning** | Any information relating to an identified or identifiable person. |
| **Behandling** | Any operation on personal data (collection, storage, use, disclosure, erasure). |
| **RoPA** | Record of processing activities (Article 30 GDPR). |
| **DPA** | Data processing agreement (Article 28) between controller and processor. |
| **DPIA** | Data protection impact assessment (Article 35) when processing is likely high risk. |
| **TIA** | Transfer impact assessment for data leaving the EEA. |

**GameChanging (processor) — from questionnaire:**  
**GameChanging AS**, org.nr. **932496321**, **Lavangsnesveien 2039**.

**Controller model:** Each **kommune** that is a Boly customer is **behandlingsansvarlig** for personal data processed in the service in connection with **that kommune’s boligformidling** (exact statutory wording: **lawyer to finalise**).

**Transparency to users:** **Both** (per questionnaire): (1) **Published list** of controllers — intended URL **bolynorge.no/behandlingsansvarige** (implement or adjust URL); (2) **In-app** naming of the relevant kommune where technically tied to the user.

**Joint controllership:** Not selected; relationship is **kommune = controller**, **GameChanging = processor** unless contracts say otherwise.

---

## 3. Product & technical scope (filled)

| Item | Value |
|------|--------|
| Production URLs | `https://www.bolynorge.no`, `https://boly-pi.vercel.app` |
| Supabase region | **eu-central-1** (Frankfurt) — confirm in dashboard |
| Supabase project ref (dashboard) | `ayddwbmkclujefnhsaqv` |
| Production DB copy to dev/staging | **No** (per questionnaire) |
| Environments holding personal data | Production web URLs above; Supabase project; **local dev** (localhost) connected to Supabase — **risk:** ensure local `.env` does **not** point to production for routine dev |

**Add elsewhere:** App store IDs when Capacitor apps are published; add to RoPA and privacy notice.

---

## 4. Lawful basis (questionnaire → operational summary)

*Art. 6 GDPR. Public-sector kommune bases — **kommune counsel must validate** against applicable Norwegian law.*

| Processing | Basis recorded (questionnaire) | Note |
|------------|-------------------------------|------|
| Homeowner/landlord account & listings | (b) | Contract / service |
| Kommune staff access | (e) | Public task / official authority — **verify** |
| Messaging | Landlord (b), Kommune (e) | Split by role |
| Email duplicate notifications | (a) | Consent via `email_notifications_enabled` |
| Push | (a) | Consent at enable |
| BankID | (b), (c) | Counsel to confirm |
| E-signing terms/handover | (b) | |
| Audit logs | (e), (c) | Counsel to confirm mix |
| Marketing | (a) | **If/when** marketing exists; **currently no** analytics/marketing tools (F37) |

**Art. 9 (special categories):** Not intentionally processed; accidental content in chat possible — mitigations: UI warning, training, requests handled case by case.

---

## 5. Sub-processors & transfers (reconciled)

**Correction:** Section E of the questionnaire listed “no sub-processors” for international transfers — that cannot mean “no vendors”; **personal data is processed by subprocessors** below. Likely intent was **“no additional US-only vendors beyond those assessed”** — **clarify with lawyer**.

**Inventory (must appear in DPA annexes and privacy notice):**

| Sub-processor | Role | Notes |
|---------------|------|--------|
| **Supabase** | Database, Auth, Storage, Edge Functions | Region **eu-central-1**; DPA with customer; US parent → assess SCCs/DPF as per Supabase terms |
| **Vercel** | Next.js hosting | **Pro** (per questionnaire); DPA/ToS; global infra — document transfer tools |
| **Mailjet** | Transactional e-mail (SMTP) | EU-focused; DPA; sender domain authentication |
| **Signicat** | BankID (OIDC) + **signing** of e.g. vilkårsavtale | Sub-processor to processing chain |

**Not used for mail (if fully migrated):** Resend — remove from live secrets and from privacy text if still mentioned.

**International transfers:** Even with EU hosting, **US companies** (Vercel, Supabase corporate, parts of Signicat/Mailjet stacks) may involve **Chapter V** tools — **list SCCs/DPF/TIA** per vendor **after** counsel review (questionnaire E32–33 left open).

---

## 6. Retention & deletion (questionnaire)

| Data area | Period stated |
|-----------|----------------|
| After listing closed (listings/messages/docs context) | **12 months** — **implement** in DB/job + **kommune** archive rules may override |
| Messages | **12 months** |
| Audit logs | **12 months** |
| Account deletion / messages | **12 months** policy stated — **kommune** may require longer retention for **journal/arkiv**; **legal sign-off** |
| Backups | **6 months** restore window; **restorer:** GameChanging — **verify** against Supabase backup settings (defaults may differ) |

**Add elsewhere:** Technical **retention jobs**, backup reality vs policy, and **DPA** wording allowing kommune to instruct longer retention where law requires.

---

## 7. Data subject rights — routines (SLA & export)

**Contact (processor line):** **info@bolynorge.no** — confirm as production privacy inbox (questionnaire A12).

**SLA (internal target):**

- Acknowledge receipt **within 3 business days**.  
- Full response **within 30 days** of verified identity (GDPR default), or extension + notice per Art. 12–15.  
- Refusal / partial erasure where **kommune** invokes **arkiv/journal** law: **GameChanging** assists technically; **kommune** decides and responds — per DPA.

**Export method:** **Manual** — Supabase SQL / admin export to structured format (JSON/CSV) + storage file list. **Roadmap:** in-app export optional later.

**Request log:** Date, requester ID method, completion date, handler — minimal personal data in the log itself.

---

## 8. Security & personal data breaches

**Internal escalation (from questionnaire):**

- **First responder:** Oskar Høgmo-Utstøl — developer/operations/technical contact (`oskar@gamechanging.no`, +46 70 149 09 81). Assesses severity **within 1 business day**; critical incidents — contact same.  
- **Management:** Lars Utstøl (daglig leder), GameChanging — informed on confirmed serious incidents.  
- **Privacy coordinator** included when breach may require Datatilsynet / user notification.  
- **Kommune** as controller notified **without undue delay** per DPA when relevant.  
- **Not 24/7 monitoring** of vendor pages — check on alerts and suspicion.

**Cyber insurance:** None stated — document risk acceptance or future cover.

**Vendor monitoring:** Oskar Høgmo-Utstøl — Supabase status, Vercel status, Mailjet notifications where available; document and notify kommuner per breach procedure.

**Add elsewhere:** Written **runbook** (1–2 pages) with Datatilsynet notification template; **deputy** if Oskar unavailable.

---

## 9. Cookies & tracking

**Strictly necessary (example from questionnaire):**

| Name | Expiry | Purpose |
|------|--------|---------|
| `sb-ayddwbmkclujefnhsaqv-auth-token` | e.g. 2027-05-20 (per browser) | Supabase auth session |

**Non-essential analytics/ads:** **None** planned — no consent banner required **until** such scripts are added.

**Add elsewhere:** Re-verify cookie names after each **Supabase** / **Next.js** major upgrade.

---

## 10. High risk & DPIA

- **Sensitive categories in messages:** Not systematic; mitigations: UI warning, training, deletion on request; **DPIA** if volume/sensitivity increases materially.  
- **Systematic monitoring:** No (per questionnaire).  
- **Existing kommune DPIA:** Not referenced — **obtain or complete** `DPIA_TEMPLATE.md`.

---

## 11. Agreements checklist (outside this repo)

| Agreement | Parties | Status / note |
|-----------|---------|-----------------|
| **DPA** kommune ↔ GameChanging | Each kommune | Master + annex (org.nr., contact, effective date) |
| **Supabase** DPA | Via terms / enterprise | Accept & file |
| **Vercel** DPA | Customer terms | Accept & file |
| **Mailjet** DPA | Account | Accept & file |
| **Signicat** | Contract | File |
| **TIA** for US transfers | Internal | Complete for Vercel/Supabase etc. as counsel advises |

---

## 12. Technical / product backlog (compliance-related)

- [ ] Implement **retention** aligned with §6 (automated deletion or anonymisation).  
- [ ] **Published list** of kommuner (behandlingsansvarlige) at agreed URL.  
- [ ] **Dynamic** kommune name in app privacy UX where required.  
- [ ] **Account/data export** UI (optional improvement beyond manual SQL).  
- [ ] Reconcile **backup** retention (§6) with Supabase actual settings.  
- [ ] Remove **Resend** secrets if Mailjet-only.  
- [ ] Replace **preliminary** disclaimer on `/personvern` after lawyer approval.

---

## 13. Sign-off (to complete)

| Role | Name | Date |
|------|------|------|
| GameChanging | | |
| Kommune (example) | | |
| Privacy notice version | e.g. v1.0 | |
| Effective date | YYYY-MM-DD | |

---

## 14. Related files in `docs/gdpr/`

| File | Status |
|------|--------|
| `RECORD_OF_PROCESSING_ACTIVITIES.md` | Updated with questionnaire data |
| `LAWFUL_BASIS_MATRIX.md` | Updated |
| `SUBPROCESSORS_AND_TRANSFERS.md` | Updated (Mailjet; reconciled list) |
| `OPERATIONAL_PROCEDURES.md` | Owners pointer added |
| `COOKIES_AND_TRACKING.md` | Cookie row filled |
| `PRIVACY_NOTICE_LEGAL_REVIEW_DRAFT.md` | Key fields filled |
| `DPIA_TEMPLATE.md` | Partially filled |
| `STAKEHOLDER_QUESTIONNAIRE.md` | Source answers preserved |

**Export:** Print or PDF **this file** + `RECORD_OF_PROCESSING_ACTIVITIES.md` + `SUBPROCESSORS_AND_TRANSFERS.md` + `OPERATIONAL_PROCEDURES.md` for a **detailed bundle** for counsel.
