# Operational procedures — data subject rights & breaches

## Assigned owners (GameChanging — from stakeholder questionnaire)

| Rolle | Kontakt |
|--------|---------|
| Teknisk / første linje ved hendelser | Oskar Høgmo-Utstøl — oskar@gamechanging.no, +46 70 149 09 81 |
| Ledelse ved bekreftet alvorlig brudd | Lars Utstøl (daglig leder), GameChanging |
| Personvernhenvendelser (processor) | info@bolynorge.no — bekreftelse innen 3 virkedager; svar innen 30 dager der ikke forlenget |
| **Kommune** som controller | Varsles uten ugrunnet opphold ved relevant brudd / avslag p.g.a. arkiv — per DPA |

**Deputy:** Define in writing if Oskar is unavailable. **Not 24/7** — business-hours response unless critical contact list extended.

Train kommune staff on **not** collecting unnecessary data in chat.

**Platform operations console (`/ops/*`):** GameChanging operators listed in `platform_operators` may manage roles, central terms approval, and aggregate statistics. All mutations are logged as `OPS_*` in `audit_logs`. Operator access is processor support processing — document in RoPA; do not use for bulk export or viewing chat message bodies.

---

## 1. Right of access (Article 15)

**Trigger:** Data subject emails privacy contact or uses in-app request (if implemented).

**Steps:**

1. **Verify identity** (match account email / BankID session / manual ID check for edge cases).
2. **Scope:** Clarify scope (all data vs specific processing).
3. **Collect:** Export from Supabase (SQL or admin tooling) — profiles, listings, messages, notifications, audit where lawful to disclose, storage file list.
4. **Third-party data:** If messages contain another person’s data, **redact** or explain limitation (Art. 15(4) balancing).
5. **Respond within one month** (extend by two months if complex — inform within first month with reasons).
6. **Format:** PDF or structured JSON; prefer machine-readable if large volume.
7. **Log** the request (date, requester, fulfilment date, handler) — **without** storing unnecessary new personal data.

**Template acknowledgement (NO):**  
*Vi har mottatt din forespørsel om innsyn. Vi behandler den innen én måned i tråd med personvernforordningen.*

---

## 2. Rectification (Article 16)

- Direct user to **profile/settings** where self-service exists.
- Kommune-corrected data: internal workflow + audit entry.

---

## 3. Erasure (Article 17)

**Assess:** Legal obligation to retain (kommune archive, accounting), ongoing contract, **freedom of expression**, establishment/exercise of legal claims.

**If erasure proceeds:**

1. Delete the `auth.users` row. FK policy (migration `20260429120000_legal_hold_fk_relaxation.sql`) now controls the downstream effect:
   - `profiles`, `listings`, `listing_invoice_basis`, `handover_reports`: `ON DELETE CASCADE` — hard-deleted.
   - `user_agreements`, `user_terms_acceptances`, `audit_logs`: `ON DELETE SET NULL` — rows kept as **tombstones** with `user_id = NULL` and `user_id_pseudonym` filled (phase 2 RPC) for legal hold per DBA §9.3.
2. **Storage buckets:** delete objects under `listings/<listing_id>/`, `handover-reports/<user_id>/`, `chat-images/<user_id>/`. Scripted via erasure RPC (phase 2); manual until then.
3. **Messages:** `chat_messages` are cascade-deleted via sender/receiver FK (pending verification in phase 2). Retain legal minimum is handled through the 24-month retention sweep.
4. **Audit logs — indirect PII:** phase 2 RPC must mask `listing_address` to municipality + postal code and strip `details.signingSessionId` from Signicat signing events. Until phase 2 is deployed, tombstone rows retain indirect identifiers — lawful as legal hold per GDPR art. 17 (3)(b)/(e) but **do not** claim full anonymisation.
5. **Backups:** point-in-time recovery rolls back erasure; documented inability until rotation (30 days by Supabase default). Re-run erasure if restore is needed.
6. **Status today:** phase 1 of 3 is implemented. Self-service account deletion is **not** yet exposed in `/settings/privacy`; users are routed to kommune DPO via Art. 17 request.

---

## 4. Restriction (Article 18)

- Flag account **restricted** in DB if implemented; otherwise **stop processing** except storage and legal claims — document.

---

## 5. Data portability (Article 20)

- Applies where processing is **by consent or contract** and **automated**.
- Provide **structured, commonly used, machine-readable** export (e.g. JSON for listings + messages).

---

## 6. Objection (Article 21)

- For **legitimate interest** processing: assess objection; stop unless **compelling legitimate grounds** — document decision.

---

## 7. Complaints

- Inform data subjects of **right to complain** to **Datatilsynet** (Norway): https://www.datatilsynet.no/

---

## 8. Personal data breach (Articles 33–34)

### 8.1 Definition

Confidentiality, integrity, or availability breach leading to **accidental or unlawful** destruction, loss, alteration, unauthorised disclosure of, or access to personal data.

### 8.2 Internal response (0–72h awareness)

| Time | Action |
|------|--------|
| T+0 | Discoverer escalates to **security owner** |
| T+4h | Containment: revoke tokens, block IP, disable compromised account |
| T+24h | Initial assessment: categories, approx. number of data subjects, likely consequences |
| T+72h | **Supervisory authority** notification if required (Datatilsynet) |
| Without undue delay | **Data subject** notification if high risk |

### 8.3 Authority notification (Art. 33)

Include: nature of breach, categories and approx. numbers, likely consequences, measures taken/proposed, DPO contact if any.

### 8.4 Documentation

Maintain **breach register** (all incidents, including near-misses): date, description, effects, remedial action.

### 8.5 Processor breach

If Supabase/Signicat/Mailjet/Vercel reports breach: follow their instructions; assess impact on your data subjects; coordinate notifications to **kommune** controllers as required by DPA.

---

## 9. Data protection by design / review

- **Privacy review** for new features (checklist: minimisation, RLS, notice update).
- **Annual** review of this document and RoPA.
