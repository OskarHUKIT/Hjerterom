# Demo-data: Ofoten / Nav Narvik (vår 2026)

Rikt demoscenario for å forstå **alle spor** i Hjerterum: sosial formidling, turisme, arrangement, Los, bookinger.

## Kjør

Supabase Dashboard → **SQL Editor** → lim inn og kjør:

[`supabase/scripts/seed_narvik_ofoten_demo.sql`](../scripts/seed_narvik_ofoten_demo.sql)

**Passord:** `Ofoten2026!` for alle `@demo.ofoten.no`-kontoer.

Idempotent — kjør på nytt for å resette.

---

## Hva du får

| Type | Antall | Merknad |
|------|--------|---------|
| Utleierkontoer | **23** | Inkl. Tommy med 5 boliger, Geir med 3 hybler |
| Boliger totalt | **38** | Narvik, Ankenes, Bjerkvik, Evenes, Gratangen, Ballangen |
| Sosial lane | ~18 | Formidla, Tilgjengelig, Utilgjengelig |
| Turisme lane | ~22 | Instant book, strict/flexible/moderate avbestilling |
| Arrangement | **5** | Publisert, utkast, avsluttet; turisme + saksbehandler |
| Bookinger | **9** | pending, accepted, paid, completed, rejected, cancelled |
| Los-saker | **4** + 1 åpen chat | Narvik + Gratangen |
| Event-henvendelser | **4** | new, assigned, mediated, closed |
| Gjestekontoer | **3** | Emma (DE), Pierre (FR), Ole (NO) |

---

## Utleiere (utvalg)

| E-post | Person | Boliger | Spor |
|--------|--------|---------|------|
| `tommy.hakonsen@demo.ofoten.no` | Tommy Håkonsen | 5 i Fagernesveien | Mix sosial/turisme |
| `geir.lund@demo.ofoten.no` | Geir Lund | 3 hybler Dronningens gate | Sosial formidling |
| `ingrid.fotland@demo.ofoten.no` | Ingrid Fotland | Hytte + studio Skjomen | Turisme / ski-festival |
| `elin.bakken@demo.ofoten.no` | Elin Bakken | Havnegata — turisme + sosial | **Begge lanes** |
| `aase.lindgren@demo.ofoten.no` | Åse Lindgren | Gård + naustleie Gratangen | Sosial + sommerleir |
| `frank.pedersen@demo.ofoten.no` | Frank-Ole Pedersen | 2 rekkehus Ballangen | Veidekke opt-in |
| `lisa.chen@demo.ofoten.no` | Li Chen | Fjordleilighet Taraldsvik | Premium turisme |
| `marit.hansen@demo.ofoten.no` | Marit Hansen | Bjerkvik | Co-host: Kjell-Arne Moen |

Full liste i SQL-filen (`jsonb`-blokken for utleiere).

---

## Arrangement

1. **Arctic Ski Festival Ofoten 2026** — *turisme*, 16 boliger opt-in  
2. **Veidekke Ofotbanen** — *saksbehandler*, entreprise-henvendelser  
3. **Nav sommerleir Gratangen** — *saksbehandler*, Silje/Åse opt-in  
4. **Hålogaland Ultra 2026** — *utkast* (Ops ser draft)  
5. **Polarsirkelen Motor 2025** — *avsluttet* (arkiv)

---

## Anbefalt gjennomgang

### Kommune (Tina / Lars / Sigrid)
- `/nav/database` — mange boliger, filter **Arrangement**
- `/nav/los-inbox` — 4 saker i ulike statuser
- `/nav/event-inquiries` — Veidekke + sommerleir

### Utleier
- **Ingrid** — pending booking fra Emma  
- **Tor** — accepted booking, instant book  
- **Tommy** — 5 boliger, mix lanes  
- **Marit** — co-host med Kjell

### Finn / turisme
- `/finn` — kart med ~22 turismeboliger  
- `/finn/arrangement/arctic-ski-narvik-2026`  
- Logg inn som **emma.becker@demo.ofoten.no** → `/finn/mine`

### Ops
- `/ops/events` — 5 arrangement  
- `/ops/kommuner` — Ofoten aktivert  
- `/ops/accounts` — mange utleiere

### Los (uten innlogging)
- `/los` — ny anonym chat (ikke i seed, men live)

---

## Kommune / event / admin

| Rolle | E-post |
|-------|--------|
| Kommune admin | `tina.olsen@demo.ofoten.no` |
| Saksbehandler | `lars.moen@demo.ofoten.no` |
| Los-fokus | `sigrid.bakken@demo.ofoten.no` |
| Event-koordinator | `kari.event@demo.ofoten.no` |
| Ops | `ops@demo.ofoten.no` (eller `ops@test.hjerterum.no`) |

---

## Rydding

Kjør scriptet på nytt, eller `supabase/scripts/cleanup_for_testing.sql` + slett Auth-brukere.
