'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { PreliminaryLegalDisclaimer } from './PreliminaryLegalDisclaimer'

const sectionTitle: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: '1.25rem',
  marginBottom: 'var(--space-2)',
}
const body: CSSProperties = { color: 'var(--text-body)' }
const sectionGap: CSSProperties = { marginBottom: 'var(--space-6)' }

/**
 * Preliminære brukervilkår for Boly – brukes i signeringsscroll (uten PDF) og på /brukervilkar.
 */
export function BrukervilkarContent({ showDisclaimer = true }: { showDisclaimer?: boolean }) {
  return (
    <>
      {showDisclaimer ? <PreliminaryLegalDisclaimer /> : null}

      <h2
        style={{
          color: 'var(--text-main)',
          fontSize: '1.6rem',
          marginBottom: 'var(--space-6)',
          borderBottom: '2px solid var(--border-subtle)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        Brukervilkår for Boly
      </h2>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>1. Tjenesten og hvem avtalen gjelder for</h3>
        <p style={body}>
          Boly («tjenesten») er en digital løsning som støtter formidling av boliger fra private
          utleiere til personer som trenger bostøtte eller annen kommunal bistand til bolig, i tråd
          med kommunens oppgaver. Ved å opprette konto og bruke tjenesten forplikter du deg til
          disse vilkårene. For utleiere innebærer det blant annet å registrere boliginformasjon, å
          holde opplysningene oppdaterte, og å følge gjeldende kommunale rutiner der det er
          relevant.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>2. Registrering, innlogging og identitet</h3>
        <p style={body}>
          Tilgang kan kreve innlogging og signering med BankID eller tilsvarende godkjent eID der
          løsningen er tilkoblet dette. Du er ansvarlig for at opplysninger du gir ved registrering
          er riktige og fullstendige. Du skal holde innloggingsopplysninger konfidensielle og varsle
          oss uten ugrunnet opphold dersom du mistenker misbruk av kontoen din.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>3. Innhold, boligannonser og oppførsel</h3>
        <p style={body}>
          Du skal kun legge inn informasjon du har rett til å dele, og som ikke er villedende. Du
          plikter å følge gjeldende lov om blant annet boligutleie, markedsføring og personvern.
          Misbruk, forsøk på uautorisert tilgang, eller bruk som strider med formålet til tjenesten,
          kan føre til stenging av tilgang og eventuelt annen oppfølging.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>4. Kommunens rolle og formidling</h3>
        <p style={body}>
          Kommunen kan bruke tjenesten til å finne egnede boliger og understøtte formidling.
          Kommunen er normalt ikke part i det private leieforholdet mellom utleier og leietaker med
          mindre annet følger av egen avtale eller lov. Eventuelle krav knyttet til selve
          husleieforholdet reguleres i utgangspunktet av leiekontrakt og privatrettslige regler.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>5. Varsler, meldinger og teknisk drift</h3>
        <p style={body}>
          Vi kan sende deg nødvendige drifts- og sikkerhetsmeldinger knyttet til kontoen. Tjenesten
          leveres «som den er» i den utstrekning loven tillater; kortvarige avvik kan forekomme ved
          vedlikehold eller forhold utenfor vår kontroll.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>6. Personvern</h3>
        <p style={body}>
          Behandling av personopplysninger beskrives nærmere i den preliminære personvernerklæringen
          på{' '}
          <Link href="/personvern/" style={{ color: 'var(--color-accent)' }}>
            personvernsiden
          </Link>
          . Ved motstrid mellom korte henvisninger her og personvernerklæringen, skal
          personvernerklæringen prioriteres når det gjelder personvern.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>7. Oppsigelse, endring av vilkår og sletting</h3>
        <p style={body}>
          Du kan trekke samtykker der samtykke er grunnlag, og be om sletting eller innsyn i tråd
          med personvernerklæringen og gjeldende lov. Vi kan oppdatere brukervilkårene; vesentlige
          endringer bør kommuniseres på forsvarlig vis (for eksempel i tjenesten eller på e-post).
          Fortsatt bruk etter slik varsling kan anses som aksept der loven tillater det.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>8. Ansvarsbegrensning og lovvalg</h3>
        <p style={body}>
          I den utstrekning det følger av ufravikelig forbrukerlovgivning eller annen tvingende
          rett, forblir dine rettigheter uendret. For øvrig reguleres avtalen av norsk lov. Tvister
          søkes løst i minnelighet; verneting etter norsk tvistelov.
        </p>
      </section>

      <section style={{ ...sectionGap, marginBottom: 0 }}>
        <h3 style={sectionTitle}>9. Kontakt</h3>
        <p style={body}>
          Spørsmål om tjenesten kan rettes til den kontaktkanalen kommunen eller driftspartner angir
          i tjenesten, for eksempel{' '}
          <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
            info@bolynorge.no
          </a>
          .
        </p>
      </section>
    </>
  )
}
