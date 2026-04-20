import type { CSSProperties } from 'react'
import Link from 'next/link'
import { PreliminaryLegalDisclaimer } from '../components/legal/PreliminaryLegalDisclaimer'

const h2: CSSProperties = {
  color: '#0f172a',
  fontSize: '1.35rem',
  marginTop: 'var(--space-8)',
  marginBottom: 'var(--space-3)',
  borderBottom: '2px solid #f1f5f9',
  paddingBottom: 'var(--space-2)',
}
const p: CSSProperties = { color: '#334155', marginBottom: 'var(--space-3)' }
const ul: CSSProperties = {
  color: '#334155',
  paddingLeft: '1.25rem',
  marginBottom: 'var(--space-4)',
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
            Preliminær personvernerklæring for Boly, tilpasset norsk personopplysningslov og GDPR
            der det er relevant.
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            background: '#ffffff',
            color: '#1e293b',
            lineHeight: 1.75,
            fontSize: '1.05rem',
          }}
        >
          <PreliminaryLegalDisclaimer />

          <h2 style={{ ...h2, marginTop: 0 }}>1. Formål og behandlingsgrunnlag</h2>
          <p style={p}>
            Vi behandler personopplysninger for å levere boligformidlingstjenesten: blant annet
            brukerkonto, boligannonser, kommunikasjon med kommune og utleier, signering med BankID
            der det er aktivert, samt sikkerhet, drift og statistikk i nødvendig omfang.
            Behandlingen skjer på grunnlag av avtale med deg som bruker der det er naturlig,
            berettiget interesse der loven tillater det (f.eks. sikkerhet og misbruksvern), samtykke
            der vi innhenter samtykke (f.eks. valgfrie funksjoner eller informasjonskapsler som ikke
            er strengt nødvendige), og/eller lovpålagte plikter for offentlige aktører der det er
            aktuelt.
          </p>

          <h2 style={h2}>2. Behandlingsansvar og databehandlere</h2>
          <p style={p}>
            Hvem som er behandlingsansvarlig for en konkret behandling (kommune, leverandør eller
            felles ordning) må avklares endelig i databehandleravtaler og internkontroll. Typisk vil
            en kommune eller samarbeidspartner stå som ansvarlig overfor innbyggere, mens
            IT-leverandører kan opptre som databehandlere under skriftlig avtale. Denne teksten er
            et utkast til du kan fylle inn konkrete virksomhetsnavn og organisasjonsnummer etter
            avklaring.
          </p>

          <h2 style={h2}>3. Hvilke opplysninger behandles</h2>
          <p style={p}>Avhengig av hvordan du bruker tjenesten kan vi behandle:</p>
          <ul style={ul}>
            <li>Identitets- og kontaktopplysninger (navn, e-post, telefon).</li>
            <li>Innhold i boligannonser og tilknyttede dokumenter du laster opp.</li>
            <li>
              Tekniske data (IP-adresse, enhetsinformasjon, logger for feilsøking og sikkerhet).
            </li>
            <li>
              Opplysninger knyttet til BankID-signering der funksjonen brukes (tidspunkt,
              dokumentversjon).
            </li>
            <li>
              Opplysninger som er nødvendige for kommunens formidlingsoppdrag, innenfor det som er
              lovlig.
            </li>
          </ul>

          <h2 style={h2}>4. Utlevering og overføring</h2>
          <p style={p}>
            Opplysninger kan deles med autorisert personell i kommune som trenger dem i
            formidlingsarbeid, og med tekniske underleverandører som drift og lagring (typisk innen
            EØS), etter databehandleravtale. Overføring utenfor EØS skal kun skje med gyldig
            overføringsgrunnlag etter GDPR kapittel V.
          </p>

          <h2 style={h2}>5. Lagringstid</h2>
          <p style={p}>
            Vi lagrer opplysninger så lenge det er nødvendig for formålet og eventuelle rettslige
            oppbevaringsplikter (for eksempel regnskaps- og arkivkrav for offentlig sektor).
            Deretter slettes eller anonymiseres data i tråd med interne rutiner.
          </p>

          <h2 style={h2}>6. Dine rettigheter</h2>
          <p style={p}>Under gjeldende vilkår har du blant annet rett til:</p>
          <ul style={ul}>
            <li>Innsyn i egne opplysninger.</li>
            <li>Retting av uriktige opplysninger.</li>
            <li>
              Sletting («retten til å bli glemt») der det ikke er tungtveiende grunnlag for videre
              lagring.
            </li>
            <li>
              Dataportabilitet der behandlingen er basert på samtykke eller avtale og skjer
              automatisk.
            </li>
            <li>Å protestere mot behandling som bygger på berettiget interesse.</li>
            <li>Å trekke samtykke når behandlingen er basert på samtykke.</li>
          </ul>
          <p style={p}>
            Du kan klage til Datatilsynet dersom du mener behandlingen strider mot
            personvernreglene:{' '}
            <a
              href="https://www.datatilsynet.no/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-royal-blue, #2563eb)' }}
            >
              datatilsynet.no
            </a>
            .
          </p>

          <h2 style={h2}>7. Informasjonskapsler (cookies)</h2>
          <p style={p}>
            Ved første besøk vises et valg om informasjonskapsler. <strong>Nødvendige</strong>{' '}
            kapsler brukes for innlogging, sikkerhet og økt mot vår leverandør (f.eks. Supabase) –
            uten disse fungerer ikke innlogget bruk som tiltenkt. Velger du «Kun nødvendige», bruker
            vi ikke valgfrie kapsler til analyse eller markedsføring. Velger du «Godta alle»,
            samtykker du i tillegg til slike valgfrie formål når de tas i bruk. Du kan når som helst
            endre valget via «Informasjonskapsler» i bunnteksten på siden. Enkelte innstillinger
            (f.eks. språk) kan også lagres lokalt i nettleseren; det følger av hvordan du bruker
            tjenesten.
          </p>

          <h2 style={h2}>8. Sikkerhet</h2>
          <p style={p}>
            Vi iverksetter rimelige tekniske og organisatoriske tiltak for konfidensialitet,
            integritet og tilgjengelighet. Ingen løsning er imidlertid 100 % sikker; du bør velge
            sterke passord der passord brukes, og melde fra ved mistanke om misbruk.
          </p>

          <h2 style={h2}>9. Kontakt</h2>
          <p style={{ ...p, marginBottom: 0 }}>
            For henvendelser om personvern kan du kontakte oss på{' '}
            <a
              href="mailto:info@bolynorge.no"
              style={{ color: 'var(--color-royal-blue, #2563eb)' }}
            >
              info@bolynorge.no
            </a>
            . Merk at endelig behandlingsansvarlig må kunne identifiseres i den ferdige erklæringen.
          </p>
        </div>
      </div>
    </main>
  )
}
