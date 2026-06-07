# Lawful basis matrix (Article 6 / 9) — Boly (questionnaire merged)

**Status:** Filled from `STAKEHOLDER_QUESTIONNAIRE.md` — **kommune counsel must validate** public-sector bases.

---

## Article 6 — Agreed starting points (product)

| Processing | Basis (recorded) | Notes |
|------------|------------------|--------|
| Homeowner/landlord account & listings | **(b)** | Contract / service. |
| Kommune staff accounts & access | **(e)** | Public task / official authority — **verify** against konkret lovhjemmel. |
| Messaging | **(b)** landlord; **(e)** kommune | Split by role in RoPA. |
| E-mail notifications (duplicate in-app, body may mirror chat) | **(a)** | `email_notifications_enabled` — consent. |
| Push notifications | **(a)** | User enables in browser/app. |
| BankID login | **(b)** and **(c)** | Counsel to narrow. |
| Electronic signing (vilkår/handover) | **(b)** | Contract / documentation. |
| Audit logs | **(e)** and **(c)** | Counsel to confirm. |
| Marketing | **(a)** | **Only if** marketing is used; questionnaire F37: **no** analytics/marketing tools currently — treat marketing row as **N/A until feature exists**. |

---

## Article 9 — Special categories

**Intention:** No systematic processing of Art. 9 categories.

**Accidental content in chat:** UI warning; training; handle access/erasure requests case by case; DPIA if scale/sensitivity increases.

---

## Consent evidence (Art. 6(1)(a))

For e-mail and push: document **UI state** + **timestamp** where the product stores it; ensure **withdrawal** as easy as consent (`email_notifications_enabled` = false, push unsubscribe).

---

## LIA (Art. 6(1)(f)) where used

If **P13** infra logging relies on **(f)** legitimate interests: complete **LIA** (necessity, balancing test) — owner: technical lead, date: before relying on (f) alone.
