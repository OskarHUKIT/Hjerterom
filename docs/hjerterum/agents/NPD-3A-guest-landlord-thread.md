# Agent brief — NPD-3A: Leietaker↔utleier melding per booking

**Prioritet:** P1 (vekst P0)  
**Kilde:** PRODUKTANALYSE §1.1, growth INFO  
**Branch suffix:** `npd-3a-guest-thread`

## Oppgave

Én chat-tråd per turisme-booking (Airbnb-konvensjon):

- Datamodell / kanal i `chat_messages` eller dedikert booking-tråd
- Finn: melding fra `/finn/mine` eller booking-detalj
- Utleier: synlig i manage/booking-requests med tydelig «leietaker»-merking

## Akseptansekriterier

- [ ] Emma kan sende melding til Ingrid på aktiv booking
- [ ] RLS: kun booking-parter ser tråden
- [ ] Dokumentert i `SERVICE_FLOW.md`
