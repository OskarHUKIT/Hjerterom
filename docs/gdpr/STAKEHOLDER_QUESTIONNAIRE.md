# Stakeholder questionnaire (required to finalise GDPR documents)

Answer in a separate document or below each section. Mark **N/A** where not applicable. This feeds **RECORD_OF_PROCESSING_ACTIVITIES**, **privacy notice**, **DPAs**, and **DPIA**.

---

## A. Identity & governance

### Chosen model (fill once)

**We use: _[x]_ kommune(r) som **behandlingsansvarlig** for behandling som skjer i kommunens boligformidlingsoppdrag i Boly; **GameChanging AS** som **databehandler** etter databehandleravtale.**  
(Joint controllership: _[ ]_ nei / _[ ]_ ja — hvis ja, kryssreferer til egen avtale.)

---

### A1. Databehandler (processor) — dere (én entitet for hele produktet)

1. **Legal name, org.nr., address** for **GameChanging** (databehandler for alle kommuner som kunde):
GAMECHANGING AS, 932496321, Lavangsnesveien 2039
   - **Example:** `GAMECHANGING AS`, org.nr., forretningsadresse (fyll inn).

---

### A2. Behandlingsansvarlig (controller) — skalerbar modell for mange kommuner

Du **må ikke** liste alle kommuner i dette skjemaet hvis dere vedlikeholder et **offisielt register** annet sted. Fyll inn **mønsteret** og **ett eksempel**.

2. **Controller-prinsipp (én setning til personvern/RoPA):**  
   *«Hver kommune som er kunde av Boly er behandlingsansvarlig for personopplysninger som behandles i tjenesten i forbindelse med [kommunens boligformidling / konkret formål — FILL].»*

3. **Register over deltakende kommuner:**  
   - [ ] Vi publiserer en **oppdatert liste** (URL: `Bolynorge.no/behandlingsansvarige`) med kommunenavn, org.nr., og ev. personvernkontakt.  
   - [ ] Vi navngir **kun den aktuelle kommunen** i appen (dynamisk ut fra bruker/kommune-tilknytning).  
   - [x] Begge deler.

4. **Eksempel-kommune** (for maler — første kunde eller fiktiv test): Navn, org.nr., personvern-/kontaktperson e-post:  
   `________________________________________________`

5. **Antall kommuner** (ca.) ved lansering / innen 12 mnd: `______`

---

### A3. Avtaler som skalerer (én mal + vedlegg per kommune)

6. **Master databehandleravtale (DPA):** Filnavn / versjon / dato dere bruker for **alle** kommuner: `_____________`  
7. **Kommune-vedlegg (annex)** per kunde — standard felter dere alltid fyller inn (sjekk av):  
   - [ ] Kommunens fulle navn og org.nr.  
   - [ ] Kontaktpunkt for personvernhenvendelser **hos kommunen** (e-post — kan være felles postkasse).  
   - [ ] Eventuelt region / avdeling som bruker Boly.  
   - [ ] Dato for ikrafttredelse for denne kommunen.

8. **Første linje mot brukere (SAR, sletting):**  
   - [ ] Brukere henvender seg til **GameChanging** (`info@bolynorge.no` eller annen — FILL: `_____________`); GameChanging utfører som databehandler etter **instruks fra / avtale med** kommunen.  
   - [ ] Brukere henvender seg **primært til kommunen** (e-post: `_____________`).  
   - [ ] **Begge** er oppgitt i personvernerklæring med klar prioritering (beskriv):  
     `________________________________________________`

---

### A4. Roller utover «én kommune»

9. **DPO** hos GameChanging eller hos kommune? (Navn, e-post — eller N/A / avklares per kommune.)  
10. **Felles kontakt for Datatilsynet** i praksis (hvem utarbeider svar ved klage): GameChanging / kommune / avhengig av sak — `_____________`

---

### A5. Avklaring (tidligere spørsmål)

11. **Joint controllership** med kommune: _[ ]_ nei (kun processor) / _[ ]_ ja — da trengs egen art. 26-avtale i tillegg til DPA.

12. Er `info@bolynorge.no` **endelig** som personvernkontakt for **processor-linjen**? Hvis nei: `_____________`

---

## B. Product & scope

13. **Production URLs** (web) and **app store IDs** (if Capacitor apps published).
https://boly-pi.vercel.app/ , https://www.bolynorge.no/
14. **Supabase project region** (e.g. `eu-north-1`, Frankfurt, London) — exact region from dashboard.
eu-central-1
15. **Is production data ever copied** to staging/dev? If yes, describe anonymisation.
no
16. **List all environments** (prod, test, demo) that hold personal data.
https://boly-pi.vercel.app/ , https://www.bolynorge.no/ , https://supabase.com/dashboard/project/ayddwbmkclujefnhsaqv , Local dev (localhost connected to supabase)

---

## C. Lawful basis (per major purpose)

For each, state **primary** Article 6 basis and, if ever special categories (Art. 9), the Art. 9 basis:

17. **Homeowner/landlord account & listings** — contract, legitimate interest, or other? *(Lawful basis is typically assessed **per controller**; kommune may cite **offentlig myndighetsutøvelse** / **lovhjemmel** — avklar med jurist.)*
(b)
18. **Kommune staff accounts & access to listings/messages** — legal obligation, public task, contract?
(e)
19. **Messaging between landlord and kommune** — which basis(es)?
Landlord: (b) , Kommune (e)
20. **Email notifications** (duplicate of in-app, including message body in email) — consent (`email_notifications_enabled`) vs. necessary for service?
(a)
21. **Push notifications** — consent vs. legitimate interest?
(a)
22. **BankID login** — necessary for strong authentication / regulatory need?
(b) , (c)
23. **Electronic signing of terms/handover** — contract / legal claim?
(b)
24. **Audit logs** — legitimate interest, legal obligation, or public authority task?
(e) , (c)
25. **Marketing** (if any) — consent only?
(a)

Article 9: For all rows above, write “Not applicable — we do not intentionally process special categories; accidental content in chat is out of scope / handled by policy”
---

## D. Retention & deletion

26. **How long** after a listing is closed should data remain (listings, messages, documents)?
12 months
27. **Messages:** fixed period (e.g. 12/24 months) or until account deletion?
12 months
28. **Audit logs:** minimum retention for your sector (kommune archive rules)?
12 months
29. **Backup retention** (Supabase backups): period and who can restore.
6 months, GAMECHANGING AS
30. **Account deletion:** should messages be deleted, anonymised, or retained for legal claims? **Legal input required.** *(Kommunen som controller avgjør ofte i lys av arkiv/journal — GameChanging utfører teknisk.)*
12 months

---

## E. International transfers

31. Confirm **all** sub-processors outside **EEA** (Supabase if US legal entity; Mailjet; Signicat; hosting).
no sub-processors
32. For each: **SCCs**, **adequacy**, or **BCRs** in place? (Attach or link to vendor terms.)
33. **TIA** completed for US cloud? Date and owner?

---

## F. Sub-processors

34. **Mailjet**
Sending notification mail
35. **Signicat** products in prod: BankID only, or also signing — confirm.
Signing villkårsavtale
36. **Hosting:** Vercel or other — plan name and data processing terms accepted date.
Pro plan(?).
37. Any **future** tools: analytics, Hotjar, Sentry, Intercom — yes/no?
no

---

## G. Data subjects & rights

38. **Languages** offered for privacy information (NO / SE / EN — confirm all match legal obligations).
Norwegian, English and Samegiella
39. **Process owner** for access/erasure requests at **GameChanging** (name, role) — *utfører på vegne av kommuner etter avtale.*
40. **SLA** for responding (target: within 30 days GDPR default unless extended) — *koordiner med kommune ved avslag p.g.a. arkivlov.*
Mål: Bekrefte mottak innen 3 virkedager. Fullt svar på innsyn/sletting innen 30 dager etter 
verifisert identitet, i tråd med GDPR. Ved behov for forlengelse (komplekse forespørsler): 
varsel til den registrerte innen 30 dager med begrunnelse og ny frist (inntil 2 måneder totalt).
Avslag eller delvis sletting der kommunen som behandlingsansvarlig påberoper seg arkiv-/journalplikt 
eller annen lovhjemmel: GameChanging bistår teknisk; endelig vurdering og svar til bruker koordineres 
med aktuell kommune (DPA).

41. **How** will you export data (manual SQL, in-app export, both)?
Manual (Supabase SQL / admin export)

---

## H. Security & incidents

42. **Who** is notified internally for a suspected breach (roles, 24/7 or business hours)?
Oskar Høgmo-Utstøl (utvikler/drift/support/tekniskansvarlig) på (oskar@gamechanging.no , +46701490981) vurderer alvorlighetsgrad innen 1 arbeidsdag. Ved kritisk lekkasje kontakt Oskar Høgmo-Utstøl på (+46701490981). Daglig leder i GAMECHANGING, Lars Utstøl, informeres. Aktuell personvernkoordinator inkluderes ved bekreftet brudd som kan kreve melding til Datatilsynet/brukere. Aktuell kommune som behandlingsansvarlig 
varsles uten ugrunnet opphold etter vurdering (jf. DPA).

43. **Cyber insurance** — yes/no; policy reference?
nei
44. **Subprocessor breach notification** — who monitors vendor status pages? *(GameChanging varsler **kommunen** som controller uten ugrunnet opphold.)*
Primært: [Oskar Høgmo-Utstøl, Teknisk ansvarlig] abonnerer på leverandørens status-/incident-kanaler 
(Supabase status, Vercel status, Mailjet e-postvarsler der tilgjengelig).
Ved leverandørmelding om brudd: samme person dokumenterer hendelsen, vurderer om 
personopplysninger berørt, og varsler berørte kommuner som behandlingsansvarlige etter DPA 
samt internt etter rutine §42.
Ingen dedikert 24/7-overvåking; sjekk ved mistanke eller når varsler mottas.
---

## I. Cookies & tracking

45. **Exact cookies** set by Next.js / Supabase session (names, duration, purpose).
sb-ayddwbmkclujefnhsaqv-auth-token , 2027-05-20T14:06:01.572Z , Innloggingsøkt (Supabase)
46. Any **non-essential** cookies or scripts planned (analytics, ads)? If yes, consent banner required before load.
Nei. Ingen analyse-, annonse- eller sporingsskript planlagt per [dato]. 
Kun nødvendige kapsler for innlogging/sikker økt. Samtykkebanner for 
ikke-nødvendige kapsler er derfor ikke aktivert.

Ved senere innføring av analyse: samtykke før lasting + oppdatering av 
personvernerklæring og cookie-register.

---

## J. High-risk processing

47. **Large-scale** processing of sensitive categories in messages — expected? Mitigations besides UI warning?
Vi forventer ikke systematisk behandling av sensitive kategorier (art. 9) som del av tjenesten. 
Meldinger kan imidlertid inneholde fritekst; risiko for tilfeldig innhold vurderes lav/middels 
avhengig av volum.

Tiltak: tydelig UI-advarsel mot sensitive opplysninger i chat, brukerveiledning for kommune/utleier, 
sletting/henvendelse ved forespørsel, vurdering av DPIA ved vesentlig endring av bruk eller volum.
48. **Systematic monitoring** of individuals — no / yes (explain)?
Nei. Ingen systematisk overvåking i betydning av profilering på tvers av tjenester eller 
tilsyn som i stor skala kartlegger enkeltpersoners atferd utover det som følger av 
normal saksbehandling og sikkerhetslogger i appen.
49. **DPIA** already done elsewhere (kommune) that covers this system — reference?

---

## K. Sign-off

50. **Name, title, date** of person approving the final privacy notice (GameChanging + ev. juridisk hos eksempel-kommune).
51. **Version** and **effective date** for first production release.

---

*Return completed answers to the product owner / DPO / counsel; then merge into `RECORD_OF_PROCESSING_ACTIVITIES.md` and `PRIVACY_NOTICE_LEGAL_REVIEW_DRAFT.md`.*
