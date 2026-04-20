# Data Protection Impact Assessment (DPIA) — Boly

**Product:** Boly / Boligbanken  
**Version:** 0.2 (partially filled from questionnaire)  
**Owner:** Oskar Høgmo-Utstøl (technical) — **kommune DPO/legal to co-sign**  
**Date:** [ ]

---

## 1. Description of processing

- **Nature:** Housing mediation: accounts, listings, messaging, documents, optional BankID, e-signing, notifications (in-app, e-mail, push).
- **Scope:** Norway — kommuner using Boly; production URLs incl. bolynorge.no.  
- **Context:** Kommune = controller; GameChanging AS = processor.  
- **Purpose:** Match RoPA (`RECORD_OF_PROCESSING_ACTIVITIES.md`).

---

## 2. Necessity and proportionality

| Question | Answer (draft) |
|----------|----------------|
| Necessary for legitimate purpose? | Yes — boligformidling. |
| Less data possible? | Minimisation in product; chat warning on sensitive data. |
| Minimised retention? | Policy 12m for several categories — **align** with kommune archive law. |

---

## 3. Risks to individuals (filled)

| Risk | Likelihood | Severity | Mitigation | Residual |
|------|------------|----------|------------|----------|
| Account takeover | Medium | High | Strong auth, RLS, monitoring | Low-med |
| Message body in e-mail | Medium | Med | Opt-in e-mail, TLS | Med |
| Excessive kommune access | Low | Med | Whitelist, RLS, audit | Low |
| Accidental sensitive data in chat | Low-med | Med-high | UI warning, training, SAR handling | Med |
| Signing/BankID misuse | Low | High | Signicat, validated callbacks | Low |

**Questionnaire:** No systematic Art. 9 processing; no “systematic monitoring” in profiling sense.

---

## 4. Consultation

- **DPO:** [kommune / GameChanging — fill]  
- **Datatilsynet** prior consultation (Art. 36): [only if residual high risk — lawyer]

---

## 5. Outcome

- [ ] Proceed with measures  
- [ ] Modify before proceed  

**Sign-off:** [name, role, date]

---

## References

- [Datatilsynet — innebygd personvern](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/programvareutvikling-med-innebygd-personvern/)
