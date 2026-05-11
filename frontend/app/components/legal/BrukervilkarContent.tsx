'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'

const sectionTitle: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: '1.25rem',
  marginBottom: 'var(--space-2)',
}
const body: CSSProperties = { color: 'var(--text-body)' }
const sectionGap: CSSProperties = { marginBottom: 'var(--space-6)' }
const ul: CSSProperties = {
  color: 'var(--text-body)',
  paddingLeft: '1.25rem',
  marginBottom: 'var(--space-3)',
  marginTop: 'var(--space-2)',
  lineHeight: 1.65,
}

/**
 * Brukervilkår for Boly (generell plattformbruk).
 * Utleieres kommunespesifikke BankID-avtaler og kommunens DBA mot databehandler er egne dokument.
 */
export function BrukervilkarContent() {
  return (
    <>
      <p
        style={{
          ...body,
          fontSize: '0.95rem',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <strong>Sist oppdatert:</strong> 21. april 2026 · <strong>Versjon:</strong> 2.0
      </p>

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
        <h3 style={sectionTitle}>1. Hva disse vilkårene regulerer — og hva de ikke erstatter</h3>
        <p style={body}>
          Disse brukervilkårene gjelder når du bruker den digitale tjenesten <strong>Boly</strong>{' '}
          (nettstedet og tilhørende funksjonalitet under bolynorge.no, heretter «tjenesten») som
          sluttbruker. Det omfatter blant annet registrering, innlogging, navigasjon, meldinger,
          skjemaer og annen aktivitet i løsningen, uavhengig av om du opptrer som leietaker,
          representant, utleier, eller som autorisert kommunalt eller Nav-anknyttet personell i
          tjenesten.
        </p>
        <p style={body}>
          Boly bygger på et samarbeid der <strong>Nav Narvik</strong> og{' '}
          <strong>Gamechanging AS</strong> leverer utvikling og drift av programvaren,           mens den
          enkelte <strong>kommune/saksbehandler</strong> som har aktivert Boly er behandlingsansvarlig for
          personopplysninger i den kommunale boligformidlingskjeden, jf. personvernerklæringen.
        </p>
        <p style={body}>
          For å unngå misforståelser: Følgende reguleres av <strong>andre avtaler</strong> og
          erstattes ikke av denne teksten:
        </p>
        <ul style={ul}>
          <li>
            <strong>Gamechanging AS og Nav</strong> — avtaleforhold, databehandlerroller og
            instruksjoner mellom offentlige parter og leverandør (herunder databehandleravtale etter
            GDPR art. 28 der den er inngått for Boly).
          </li>
          <li>
            <strong>Nav og utleiere i boligbanken</strong> — særskilte vilkår og dokumenter som
            kommunen/saksbehandler og Nav benytter overfor utleiere i det kommunale kretsløpet (typisk egne
            avtalevilkår og signering i boligbanken).
          </li>
          <li>
            <strong>Utleier og drift/tilbyder</strong> — drifts- eller tilknytningsavtaler som
            utleier inngår for å stille bolig til rådighet i det regulerte opplegget, herunder
            elektronisk signering der dette er påkrevd.
          </li>
        </ul>
        <p style={body}>
          <strong>Som utleier</strong> vil du derfor ha <strong>ytterligere forpliktelser</strong>{' '}
          utover disse brukervilkårene, herunder plikt til å signere og følge den gjeldende,
          kommunegodkjente avtalen for ditt område (via BankID). Ved
          motstrid mellom disse brukervilkårene og slik separat, signert utleieravtale, har den
          signerte utleieravtalen forrang for utleierforholdet; brukervilkårene gjelder fortsatt for
          din generelle bruk av plattformen (konto, sikkerhet, akseptabel bruk m.m.).
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>2. Aksept og alderskrav</h3>
        <p style={body}>
          Ved å opprette konto, logge inn eller fortsette å bruke tjenesten bekrefter du at du har
          lest og akseptert disse brukervilkårene. Er du under 18 år, skal du ha samtykke fra
          verge der dette er nødvendig etter gjeldende regler. Opplyser du uriktig alder eller
          identitet, kan tilgang stenges.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>3. Konto, autentisering og sikkerhet</h3>
        <p style={body}>
          Tilgang kan kreve elektronisk identifikasjon (for eksempel BankID) der dette er
          konfigurert. Du er ansvarlig for at opplysninger du gir, er riktige og oppdaterte. Du skal
          holde passord, engangskoder og annen tilgangsinformasjon konfidensiell, ikke dele konto
          med uvedkommende, og varsle oss uten ugrunnet opphold ved mistanke om uautorisert bruk på{' '}
          <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
            info@bolynorge.no
          </a>
          . Ved sikkerhetshendelser som kan påvirke personopplysninger, kan du også varsle{' '}
          <a href="mailto:security@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
            security@bolynorge.no
          </a>
          .
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>4. Tillatt bruk og forbudsregler</h3>
        <p style={body}>
          Du skal bruke tjenesten i samsvar med norsk lov, offentlighetsloven der den treffer inn,
          personvernregelverket og eventuelle interne retningslinjer som gjelder for din rolle
          (kommune/saksbehandler/Nav/utleier/leietaker).
        </p>
        <p style={body}>Det er blant annet ikke tillatt å:</p>
        <ul style={ul}>
          <li>forsøke å omgå tilgangskontroll, hente ut data du ikke har rett til, eller utnytte svakheter;</li>
          <li>legge inn skadelig programkode, automatisere misbruk (scraping, overbelastning) uten skriftlig samtykke;</li>
          <li>legge ut uriktig, villedende eller diskriminerende innhold, eller innhold som krenker tredjers rettigheter;</li>
          <li>bruke tjenesten til formål som står i strid med formidling av bolig i det kommunale regimet.</li>
        </ul>
        <p style={body}>
          Brudd kan medføre suspensjon eller sletting av konto, fjerning av innhold, og i alvorlige
          tilfeller politianmeldelse eller erstatningskrav.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>5. Boligannonser, meldinger og brukerinnhold</h3>
        <p style={body}>
          Du er ansvarlig for innhold du publiserer (tekst, bilder, filer, chat). Du skal kun dele
          opplysninger du har rett til å behandle, og som er nødvendige for formålet. Du gir Boly og
          de underliggende leverandørene en begrenset, ikke-eksklusiv lisens til å lagre, vise og
          teknisk reprodusere innholdet i den utstrekning det er nødvendig for å drive tjenesten og
          oppfylle avtale med kommune/saksbehandler og brukere.
        </p>
        <p style={body}>
          Kommunen/saksbehandler kan bruke tjenesten til å understøtte formidling. Kommunen/saksbehandler er i utgangspunktet
          ikke part i et privat leieforhold med mindre annet følger av avtale eller lov; krav som
          gjelder selve husleieforholdet reguleres særskilt (leiekontrakt, husleieloven m.m.).
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>6. Immaterialrett</h3>
        <p style={body}>
          Rettigheter til programvare, design, merkevarer og øvrig materiale i tjenesten tilhører
          rettighetshaverne. Ingen overdragelse av immaterielle rettigheter skjer ved bruk. Du får
          en personlig, tilbakakekallelig rett til å bruke grensesnittet i samsvar med vilkårene.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>7. Personvern</h3>
        <p style={body}>
          Behandling av personopplysninger er beskrevet i{' '}
          <Link prefetch={false} href="/personvern/" style={{ color: 'var(--color-accent)' }}>
            personvernerklæringen
          </Link>
          . Ved motstrid mellom korte henvisninger her og personvernerklæringen, går
          personvernerklæringen foran for personvern. Du kan utøve rettigheter etter GDPR kapittel
          III; henvendelser kan rettes til kommunen/saksbehandler som behandlingsansvarlig og til{' '}
          <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
            info@bolynorge.no
          </a>{' '}
          for videreformidling der det er aktuelt.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>8. Drift, endringer og tilgjengelighet</h3>
        <p style={body}>
          Tjenesten leveres som den til enhver tid er tilgjengelig. Kortvarige avbrudd kan forekomme
          ved vedlikehold eller forhold utenfor rimelig kontroll. Vi kan endre eller fjerne
          funksjoner når det er begrunnet i sikkerhet, lovkrav eller videreutvikling, forutsatt at
          vesentlige innskrenkelser varsles på forsvarlig vis der loven krever det.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>9. Opphør og sletting</h3>
        <p style={body}>
          Du kan be om sletting av konto og begrense behandling i tråd med personvernerklæringen og
          gjeldende lov. Vi kan stenge eller begrense tilgang ved vesentlig mislighold, sikkerhetsrisiko
          eller pålegg fra myndigheter. Bestemmelser som naturlig skal overleve (for eksempel om
          ansvarsbegrensning, tvisteløsning og immaterialrett) gjelder etter opphør.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>10. Ansvar</h3>
        <p style={body}>
          Tjenesten er et digitalt verktøy for formidling og kommunikasjon. Vi er ikke ansvarlige
          for utfallet av enkeltformidlinger eller for innhold som brukere legger inn, utover det som
          følger av ufravikelig rett. I den utstrekning det er tillatt etter norsk lov, er vi ikke
          ansvarlige for indirekte tap (for eksempel tap av omsetning eller goodwill). Dine
          rettigheter som forbruker etter forbrukerkjøpsloven eller annen ufravikelig lovgivning
          forblir upåvirket der disse vilkårene gjelder deg som forbruker.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>11. Endringer i brukervilkår</h3>
        <p style={body}>
          Vi kan oppdatere brukervilkårene. Vesentlige endringer varsles på forsvarlig vis, for
          eksempel i tjenesten eller på e-post. Fortsatt bruk etter et rimelig varsel kan regnes som
          aksept der loven tillater det. Ved vesentlige endringer som reduserer dine rettigheter,
          vil vi etterstrebe å innhente aktivt samtykke der det er påkrevd.
        </p>
      </section>

      <section style={sectionGap}>
        <h3 style={sectionTitle}>12. Lovvalg og tvister</h3>
        <p style={body}>
          Vilkårene reguleres av norsk lov. Tvister skal søkes løst i minnelighet. Klage på
          personvern kan rettes til Datatilsynet. Verneting følger norsk tvistelov.
        </p>
      </section>

      <section style={{ ...sectionGap, marginBottom: 0 }}>
        <h3 style={sectionTitle}>13. Kontakt</h3>
        <p style={body}>
          Generelle spørsmål om tjenesten:{' '}
          <a href="mailto:info@bolynorge.no" style={{ color: 'var(--color-accent)' }}>
            info@bolynorge.no
          </a>
          . Juridiske og personvernhenvendelser kan i tillegg rettes til kommunen/saksbehandler der du er
          registrert som bruker, når det gjelder behandlingsansvarliges plikter.
        </p>
      </section>
    </>
  )
}
