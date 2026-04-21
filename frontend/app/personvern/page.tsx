import type { CSSProperties } from 'react'
import Link from 'next/link'

const h2: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: '1.35rem',
  marginTop: 'var(--space-8)',
  marginBottom: 'var(--space-3)',
  borderBottom: '2px solid var(--border-subtle)',
  paddingBottom: 'var(--space-2)',
}
const p: CSSProperties = { color: 'var(--text-body)', marginBottom: 'var(--space-3)' }
const ul: CSSProperties = {
  color: 'var(--text-body)',
  paddingLeft: '1.25rem',
  marginBottom: 'var(--space-4)',
}
const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: 'var(--space-4)',
  fontSize: '0.95rem',
}
const th: CSSProperties = {
  textAlign: 'left',
  padding: 'var(--space-2) var(--space-3)',
  borderBottom: '2px solid var(--border-subtle)',
  color: 'var(--text-main)',
  fontWeight: 600,
}
const td: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
  verticalAlign: 'top',
}

export default function PersonvernPage() {
  return (
    <main className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link
            href="/"
            className="nav-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            ← Tilbake til forsiden
          </Link>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Personvern og informasjonskapsler
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
            Personvernerklæring for Boly, i samsvar med personopplysningsloven, GDPR og ekomloven.
            Denne siden gjengir den samme erklæringen som ligger i repoet (<code>docs/legal/PRIVACY_NOTICE.md</code>);
            ved konflikt er den norske teksten autoritativ.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            lineHeight: 1.75,
            fontSize: '1.05rem',
          }}
        >
          <h2 style={{ ...h2, marginTop: 0 }}>1. Hvem vi er</h2>
          <p style={p}>
            Boly er en tjeneste som hjelper <strong>kommuner</strong> med å formidle kontakt mellom{' '}
            <strong>utleiere</strong> og <strong>leietakere</strong> i et regulert, kommunegodkjent
            kretsløp. Tjenesten utvikles og driftes av <strong>Nav Narvik</strong> i samarbeid med{' '}
            <strong>Gamechanging</strong>.
          </p>
          <p style={p}>
            <strong>Behandlingsansvarlig:</strong> Kommunen som har aktivert Boly for sitt område er
            behandlingsansvarlig for personopplysningene om sine innbyggere. Boly opptrer som{' '}
            <strong>databehandler</strong> på vegne av kommunen.
          </p>
          <p style={p}>
            <strong>Kontakt:</strong>{' '}
            <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
              info@bolynorge.no
            </a>
          </p>

          <h2 style={h2}>2. Hvilke personopplysninger vi behandler</h2>
          <p style={p}>
            Vi behandler kun opplysninger som er nødvendige for å levere tjenesten (prinsippet om{' '}
            <em>dataminimering</em>, GDPR art. 5 (1) c):
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Kategori</th>
                  <th style={th}>Formål</th>
                  <th style={th}>Rettslig grunnlag</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>Navn, e-post, telefon</td>
                  <td style={td}>Konto, innlogging, varsler</td>
                  <td style={td}>Avtale (art. 6 (1) b)</td>
                </tr>
                <tr>
                  <td style={td}>Foretrukket språk</td>
                  <td style={td}>Språkvalg for UI og e-post</td>
                  <td style={td}>Berettiget interesse (art. 6 (1) f)</td>
                </tr>
                <tr>
                  <td style={td}>Rolle (utleier / kommune / leietaker)</td>
                  <td style={td}>Tilgangsstyring</td>
                  <td style={td}>Avtale</td>
                </tr>
                <tr>
                  <td style={td}>Kommuneregion</td>
                  <td style={td}>Knytte bruker til riktig kommune</td>
                  <td style={td}>Avtale</td>
                </tr>
                <tr>
                  <td style={td}>Adresse/koordinater på bolig</td>
                  <td style={td}>Formidling av utleieobjekt</td>
                  <td style={td}>Avtale</td>
                </tr>
                <tr>
                  <td style={td}>Husregler, overtakelsesrapporter</td>
                  <td style={td}>Leieforholdet</td>
                  <td style={td}>Avtale</td>
                </tr>
                <tr>
                  <td style={td}>Chat-meldinger, vedlegg</td>
                  <td style={td}>Kommunikasjon mellom partene</td>
                  <td style={td}>Avtale</td>
                </tr>
                <tr>
                  <td style={td}>Signeringslogg (Signicat session-id, tidsstempel)</td>
                  <td style={td}>Gyldighetsbevis for signert avtale</td>
                  <td style={td}>Rettslig forpliktelse (art. 6 (1) c)</td>
                </tr>
                <tr>
                  <td style={td}>
                    Bankkontonummer (valgfritt – kun hvis utleier velger kontobetaling for
                    fakturagrunnlag)
                  </td>
                  <td style={td}>Generere fakturagrunnlag til kommunen ved formidling</td>
                  <td style={td}>Avtale (art. 6 (1) b)</td>
                </tr>
                <tr>
                  <td style={td}>Påloggingsstatistikk / audit logs</td>
                  <td style={td}>IT-sikkerhet, feilsøking</td>
                  <td style={td}>Berettiget interesse</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={p}>
            Bankkontonummer lagres <strong>kun</strong> dersom utleier aktivt har valgt
            kontobetaling i stedet for standard fakturabetaling. Tilgang er begrenset til
            utleieren selv og kommune-ansatte i samme region (Postgres Row-Level Security), og
            informasjonen slettes automatisk 24 måneder etter siste oppdatering når boligen
            ikke lenger er aktivt formidlet. Se §5.
          </p>
          <p style={p}>
            <strong>Vi lagrer ikke</strong> fødselsnummer eller DUF-nummer, bankkort-PAN, CVV
            eller annen betalingsinstrumentslegitimasjon, helseopplysninger, etnisitet eller
            politiske meninger. Passord håndteres av Supabase Auth med bcrypt/argon2.
          </p>

          <h2 style={h2}>3. Særlige kategorier og sensitive opplysninger</h2>
          <p style={p}>
            Boly er <strong>ikke</strong> designet for å samle inn særlige kategorier av
            personopplysninger (GDPR art. 9) eller opplysninger om straffbare forhold (art. 10). Vi
            ber brukere om å{' '}
            <strong>
              unngå å dele sensitive personopplysninger (f.eks. helse, straffesak eller
              opplysninger om andre)
            </strong>{' '}
            i chatten og i fritekstfelt. Slike opplysninger er ikke nødvendige for formidlingen, og
            vil – hvis de oppstår – behandles med samme sikkerhetsnivå som øvrige chat-data og
            slettes i henhold til lagringstidene under §5.
          </p>

          <h2 style={h2}>4. Informasjonskapsler og samtykke</h2>
          <p style={p}>Boly bruker informasjonskapsler i tre kategorier:</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Kategori</th>
                  <th style={th}>Aktivt nå</th>
                  <th style={th}>Samtykke</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>
                    <strong>Strengt nødvendige</strong> (innlogging, sesjon, CSRF-tokens)
                  </td>
                  <td style={td}>Ja</td>
                  <td style={td}>Ikke påkrevd (ekomloven § 2-7b)</td>
                </tr>
                <tr>
                  <td style={td}>
                    <strong>Statistikk</strong> (anonymisert, aggregert)
                  </td>
                  <td style={td}>Planlagt</td>
                  <td style={td}>Aktivt samtykke</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={p}>
            Boly benytter <strong>ikke</strong> markedsføringskapsler eller sporing på tvers av
            nettsteder. Dersom dette innføres på et senere tidspunkt, vil vi be om et nytt aktivt
            samtykke.
          </p>
          <p style={p}>
            Du kan når som helst endre valg via <strong>«Informasjonskapsler»</strong>-knappen i
            bunnen av nettsiden. <strong>«Avvis alle»</strong> er plassert like lett tilgjengelig
            som <strong>«Godta alle»</strong>, i tråd med Datatilsynets veileder og ekomloven.
          </p>

          <h2 style={h2}>5. Lagringstid</h2>
          <ul style={ul}>
            <li>
              <strong>Kontoopplysninger:</strong> Så lenge kontoen er aktiv; kan slettes 12 måneder
              etter siste innlogging (konfigurerbart per kommune).
            </li>
            <li>
              <strong>Signerte avtaler:</strong> 5 år etter at leieforholdet er avsluttet
              (bokføringsloven § 13 (3), redusert fra 10 til 5 år i 2014). Kommunen kan
              forlenge dette ved dokumentert arkiv- eller rettsbehov.
            </li>
            <li>
              <strong>Chat-meldinger og vedlegg:</strong> 24 måneder etter siste aktivitet
              (automatisk nattlig sletting).
            </li>
            <li>
              <strong>Overtakelsesrapporter:</strong> 3 år etter at rapporten er godkjent.
            </li>
            <li>
              <strong>Bankkontonummer / fakturagrunnlag:</strong> 24 måneder etter siste
              oppdatering når boligen ikke lenger er aktivt formidlet (automatisk nattlig
              sletting). Slettes kaskadisk ved sletting av boligannonsen.
            </li>
            <li>
              <strong>Varsler (notifications):</strong> 12 måneder.
            </li>
            <li>
              <strong>Audit logs / sikkerhetslogger:</strong> 12 måneder.
            </li>
          </ul>

          <h2 style={h2}>6. Delingspartnere (databehandlere)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={th}>Leverandør</th>
                  <th style={th}>Formål</th>
                  <th style={th}>Lokasjon</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>
                    <strong>Supabase</strong> (Auth + DB + Storage)
                  </td>
                  <td style={td}>Backend, autentisering</td>
                  <td style={td}>EU (Frankfurt)</td>
                </tr>
                <tr>
                  <td style={td}>
                    <strong>Vercel</strong>
                  </td>
                  <td style={td}>Hosting av frontend</td>
                  <td style={td}>EU (Stockholm, <code>arn1</code>)</td>
                </tr>
                <tr>
                  <td style={td}>
                    <strong>Mailjet</strong>
                  </td>
                  <td style={td}>Utsending av transaksjonelle e-poster</td>
                  <td style={td}>EU</td>
                </tr>
                <tr>
                  <td style={td}>
                    <strong>Signicat</strong>
                  </td>
                  <td style={td}>BankID-signering</td>
                  <td style={td}>EU (Norge)</td>
                </tr>
                <tr>
                  <td style={td}>
                    <strong>Kartverket / Geonorge</strong>
                  </td>
                  <td style={td}>Adressesøk (ingen personidentifikasjon)</td>
                  <td style={td}>Norge</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={p}>
            Boly sender <strong>ikke</strong> personopplysninger til land utenfor EU/EØS.
          </p>

          <h2 style={h2}>7. Dine rettigheter (GDPR kap. III)</h2>
          <p style={p}>Du har rett til å:</p>
          <ul style={ul}>
            <li>få <strong>innsyn</strong> i opplysningene vi har om deg (art. 15),</li>
            <li>få <strong>rettet</strong> feil (art. 16),</li>
            <li>be om <strong>sletting</strong> (art. 17),</li>
            <li><strong>begrense</strong> behandlingen (art. 18),</li>
            <li>få <strong>dataportabilitet</strong> (art. 20),</li>
            <li><strong>protestere</strong> mot behandling basert på berettiget interesse (art. 21).</li>
          </ul>
          <p style={p}>
            Henvendelser sendes til kommunen der du bor (behandlingsansvarlig), eller til{' '}
            <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
              info@bolynorge.no
            </a>
            , som vil videreformidle.
          </p>
          <p style={p}>
            <strong>Klagerett:</strong> Du kan klage til{' '}
            <a
              href="https://www.datatilsynet.no"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-accent)' }}
            >
              Datatilsynet
            </a>{' '}
            dersom du mener behandlingen er i strid med loven.
          </p>

          <h2 style={h2}>8. Sikkerhet</h2>
          <ul style={ul}>
            <li>All kommunikasjon skjer over HTTPS (TLS 1.2+).</li>
            <li>Passord håndteres av Supabase Auth (bcrypt/argon2).</li>
            <li>
              Database-tilgang er beskyttet av <strong>Row Level Security (RLS)</strong>; ingen
              bruker kan lese data som tilhører en annen kommune eller bruker.
            </li>
            <li>
              Signering av avtaler gjøres med <strong>BankID via Signicat</strong> (kvalifisert
              elektronisk signatur).
            </li>
            <li>Ratebegrensning: maks 3 signeringsforsøk per konto per døgn.</li>
          </ul>

          <h2 style={h2}>9. Endringer</h2>
          <p style={{ ...p, marginBottom: 0 }}>
            Vesentlige endringer varsles via e-post og i appen minst 14 dager i forveien.
          </p>
        </div>
      </div>
    </main>
  )
}
