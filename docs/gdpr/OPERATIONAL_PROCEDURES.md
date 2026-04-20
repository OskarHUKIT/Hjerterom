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

1. Delete or anonymise `auth.users` row (cascade per DB design — **verify** storage objects and orphaned files).
2. **Storage buckets:** delete objects keyed to user/listing.
3. **Messages:** policy decision — delete thread, anonymise sender, or retain legal minimum — **legal sign-off**.
4. **Backups:** erasure on restore or documented inability until rotation — **document**.

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
