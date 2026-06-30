# Demo-data: Ofoten / Nav Narvik (vår 2026)

Organisk demoscenario for pilot i Narvik-regionen. Scriptet oppretter fiktive brukere, boliger, arrangement, bookinger og Los-saker som henger sammen som én historie.

## Kjør

1. Supabase Dashboard → **SQL Editor**
2. Lim inn og kjør hele filen:  
   [`supabase/scripts/seed_narvik_ofoten_demo.sql`](../scripts/seed_narvik_ofoten_demo.sql)
3. Sjekk oppsummeringsraden nederst (`demo_brukere`, `demo_boliger`, …)

Scriptet er **idempotent** — kjør på nytt for å resette demo-data (sletter `@demo.ofoten.no` og demo-arrangement).

**Passord for alle nye kontoer:** `Ofoten2026!`

---

## Historien (mars 2026)

Nav Narvik har kjørt Hjerterum i åtte måneder. Tina Olsen leder piloten for **Narvik, Gratangen, Evenes og Ballangen**. Lars-Henrik Moen og Sigrid Bakken jobber sosial formidling og Digital Los-innboks. Kari Nordgård er event-koordinator for entreprise-prosjekter.

### Utleiere i regionen

| Person | Sted | Rolle i demo |
|--------|------|----------------|
| **Ingrid Fotland** | Skjomen hytte | Turisme — ski-festival, booking fra Emma (Tyskland) |
| **Tor-Arne Johansen** | Kongens gate 42, Narvik | Instant book — svensk par har fått godkjent forespørsel |
| **Marit Hansen** | Bjerkvik | Både sosial formidling og turisme — opt-in til Veidekke-entreprise |
| **Berit Sund** | Evenes flyplass | Crew og turister — betalt booking i februar, fullført helg |
| **Åse Lindgren** | Gratangen | Sosial formidling — familie Nguyen, notat fra Lars |
| **Petter Vassvik** | Ballangen | Sosial — opt-in Veidekke |
| **Kjell-Arne Moen** | Ankenes | Turisme mot fjorden |
| **Håkon Ruud** | Strandgata, Narvik | Premium-leilighet, ski-festival |

### Arrangement

1. **Arctic Ski Festival Ofoten 2026** (14.–22. mars, *turisme*)  
   Internasjonalt skirenn. Finn viser bookbare hytter/leiligheter — ikke henvendelsesskjema.

2. **Veidekke — bolig til Ofotbanen-entreprise** (april–oktober, *saksbehandler*)  
   Thomas Berg trenger 12 plasser for montører. Røde Kors Ungdom Evenes har ny henvendelse. Kari Nordgård er koordinator.

### Bookinger (Finn)

- **Emma Becker** (München) → venter på svar, Ingrid sin hytte under ski-festivalen  
- **Lars Pettersson** → godkjent, Tor-Arne sentrum  
- **Hilde og Jon Nordahl** → betalt opphold Evenes (februar)  
- **SAS Crew** → fullført ett døgn hos Berit  

### Digital Los

| Saksnr | Status | Historie |
|--------|--------|----------|
| LOS-DEMO-001 | Ny | Marcus (19), truet med utkastelse fra hybel |
| LOS-DEMO-002 | Tildelt Lars | Samira (24) med barn, midlertidig på hotell |
| LOS-DEMO-003 | Lukket | Anders (17), økonomi + botilbud løst |

---

## Innlogging (demo)

| E-post | Rolle |
|--------|-------|
| `tina.olsen@demo.ofoten.no` | Kommune admin |
| `lars.moen@demo.ofoten.no` | Saksbehandler |
| `sigrid.bakken@demo.ofoten.no` | Saksbehandler (Los) |
| `kari.event@demo.ofoten.no` | Event-koordinator |
| `ingrid.fotland@demo.ofoten.no` | Utleier |
| `emma.becker@demo.ofoten.no` | Leietaker / gjest |
| `ops@demo.ofoten.no` | Ops (hvis `ops@test.hjerterum.no` ikke finnes) |

Eksisterende `@test.hjerterum.no`-kontoer kobles inn med grants hvis de allerede er registrert.

---

## Anbefalt gjennomgang

1. Logg inn som **Tina** → boligbank, filtrer arrangement  
2. **Lars** → `/nav/los-inbox` (Marcus + Samira), `/nav/event-inquiries` (Veidekke)  
3. **Ingrid** → godta/avslå Emmas booking  
4. **Emma** → `/finn/mine` — pending booking  
5. Offentlig → `/finn/arrangement/arctic-ski-narvik-2026` og `/los`  

---

## Rydding

Kjør scriptet på nytt, eller:

```sql
-- Se cleanup i starten av seed_narvik_ofoten_demo.sql
```

For full reset: `supabase/scripts/cleanup_for_testing.sql` + slett brukere i Auth.
