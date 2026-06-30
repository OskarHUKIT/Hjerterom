import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/workspace/docs/legal/node_modules/puppeteer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, '.digital_los_2s_style.css'), 'utf8');
const logoPath = resolve(__dirname, '../../frontend/public/logo-gamechanging.png');
const logoB64 = readFileSync(logoPath).toString('base64');
const outPdf = resolve(__dirname, 'Digital_Los_KI_Partnerproposisjon_2s.pdf');
const publicPdf = resolve(__dirname, '../../frontend/public/Digital_Los_KI_Partnerproposisjon_2s.pdf');

const html = `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<title>Digital Los — KI i boligformidling</title>
<style>${css}</style>
</head>
<body>

<section class="page">
  <div class="topbar">
    <div class="logo"><img src="data:image/png;base64,${logoB64}" alt="Gamechanging" /></div>
    <div class="meta">
      <div class="kicker">Partnerproposisjon · Juni 2026 · Versjon 2.0</div>
      <strong>Gamechanging AS</strong><br>
      Org.nr. 932 496 321<br>
      lars@gamechanging.no · +47 416 13 301
    </div>
  </div>

  <h1>Digital Los — KI i boligformidling</h1>
  <p class="subtitle">Forskningskonsortium for å utvikle, teste og evaluere KI som senker barrierer mellom offentlig boligformidling og unge i utenforskap</p>

  <div class="lead">
    <strong>Essensen:</strong> Mange unge (16–25) i utenforskap tar ikke kontakt med Nav fordi byråkratiet oppleves som uoverkommelig.
    <strong>Digital Los</strong> er en KI-drevet førstekontaktflate — naturlig språk, lav terskel, kobling til riktig saksbehandler — med <strong>bolig som inngangsport</strong>.
    Løsningen bygges som modul på <strong>Boly</strong> (bolynorge.no), allerede i produksjon hos Nav Narvik.
  </div>

  <div class="stats">
    <div class="stat"><strong>1–16 MNOK</strong><span>IPN-potensial</span></div>
    <div class="stat"><strong>24–36 mnd</strong><span>Prosjektvarighet</span></div>
    <div class="stat"><strong>3</strong><span>Konsortiepartnere</span></div>
    <div class="stat"><strong>16–25 år</strong><span>Målgruppe</span></div>
  </div>

  <h2>Problem og løsning</h2>
  <div class="grid-2">
    <div class="card">
      <h3>Utfordringen</h3>
      <p>Over 100 000 unge (16–29) står utenfor arbeid og utdanning (SSB). Bolig er en sentral barriere. Nav bruker store ressurser på oppsøkende arbeid, men mange unge når aldri første kontakt.</p>
      <p><em>«Vi vet at mange unge har behov for bolig, men de tar ikke kontakt.»</em> — innsikt fra Nav Narvik</p>
    </div>
    <div class="card">
      <h3>Digital Los — tre lag</h3>
      <ul>
        <li><strong>Kontakt:</strong> chat/voice på vanlig norsk — ingen skjema, ingen BankID i første møte</li>
        <li><strong>Forståelse:</strong> anonymisert behovsprofil (NLP + regler, dataminimering)</li>
        <li><strong>Kobling:</strong> match til riktig saksbehandler (geografi, kompetanse, fairness)</li>
      </ul>
    </div>
  </div>

  <h2>Forskningsspørsmål</h2>
  <table>
    <tr><th>#</th><th>Spørsmål</th><th>Metode</th></tr>
    <tr><td>F1</td><td>Hvilke KI-systemer når unge i utenforskap?</td><td>Prototypetesting, ≥30 intervjuer</td></tr>
    <tr><td>F2</td><td>Hvordan utvikle ansvarlig (GDPR, AI Act)?</td><td>DPIA, fairness-validering</td></tr>
    <tr><td>F3</td><td>Hvilken effekt på bolig, arbeid og integrasjon?</td><td>Kvasi-eksperiment, registerdata</td></tr>
  </table>

  <h2>Konsortium</h2>
  <table>
    <tr><th>Partner</th><th>Rolle</th><th>Bidrag</th></tr>
    <tr><td><strong>Gamechanging AS</strong></td><td>Prosjektansvarlig</td><td>Boly-plattform, KI-utvikling, IPN-søknad, IP-eierskap</td></tr>
    <tr><td><strong>UiT Narvik</strong></td><td>FoU-leverandør</td><td>AI-forskning, fairness, evaluering, publisering (oppfyller IPN-krav)</td></tr>
    <tr><td><strong>Nav Narvik</strong></td><td>Domenepartner</td><td>Pilotmiljø, brukerkontakt, sosialfaglig kompetanse</td></tr>
  </table>
  <p style="font-size:7.8pt;color:#64748b;margin:4pt 0 0;">UiT som FoU-partner er <strong>påkrevd</strong> for IPN. Nav styrker prosjektet, men er ikke formelt påkrevd for å oppfylle IPN-kravene.</p>

  <div class="partners">
    <span class="pill">Gamechanging AS</span>
    <span class="pill">UiT Narvik</span>
    <span class="pill">Nav Narvik</span>
    <span class="pill">Boly · bolynorge.no</span>
  </div>

  <div class="footer-note">Side 1 av 2 · Digital Los — KI i boligformidling · Gamechanging AS · Konfidensielt — for UiT Narvik og Nav Narvik</div>
</section>

<section class="page">
  <div class="topbar">
    <div class="logo"><img src="data:image/png;base64,${logoB64}" alt="Gamechanging" /></div>
    <div class="meta"><strong>Finansiering og oppstart</strong></div>
  </div>

  <h2>Finansieringskart (verifisert juni 2026)</h2>
  <table>
    <tr><th>Kilde</th><th>Beløp</th><th>Søker</th><th>Frist / status</th></tr>
    <tr>
      <td><strong>Forskningsrådet IPN</strong> — Industri og tjenestenæringer 2026<br><span style="color:#64748b">Hovedspor · KI i boligformidling</span></td>
      <td><strong>1–16 MNOK</strong><br>inntil 50 % støtte</td>
      <td>Gamechanging AS + UiT</td>
      <td>Løpende · oppstart tidligst 15. apr. 2026 · <strong>ikke start FoU før søknad sendt</strong></td>
    </tr>
    <tr>
      <td><strong>SkatteFUNN</strong><br><span style="color:#64748b">Supplement til IPN</span></td>
      <td><strong>19 %</strong> av FoU-kostnader</td>
      <td>Gamechanging AS</td>
      <td>Løpende · ikke dobbeltfinansiere samme kostnader uten avklaring</td>
    </tr>
    <tr>
      <td><strong>Innovasjon Norge — Oppstartstilskudd 1</strong><br><span style="color:#64748b">Markedsavklaring (tidligere OS1)</span></td>
      <td>Inntil <strong>150 000 kr</strong> / 200 000 kr m/ansatte</td>
      <td>Gamechanging AS</td>
      <td>Løpende · 3–4 ukers behandling</td>
    </tr>
    <tr>
      <td><strong>Husbanken — tilskudd til boligtiltak</strong><br><span style="color:#64748b">Nye arbeidsmetoder / kunnskapsutvikling — ikke bygging</span></td>
      <td>Typisk <strong>200k–1,5 MNOK</strong> per prosjekt</td>
      <td>Kommune, privat aktør eller UiT</td>
      <td><strong>15. mai årlig</strong> · 2026-frist passert · neste: 15. mai 2027</td>
    </tr>
    <tr>
      <td><strong>Bufdir — inkludering barn og unge</strong><br><span style="color:#64748b">Aktivitetstype «ungdomslos» (10–24 år)</span></td>
      <td>Varierer · inntil 3 år</td>
      <td>Org. med kommune-tilknytning</td>
      <td>2026 utløpt · utlysning 2027: høsten 2026</td>
    </tr>
  </table>

  <div class="warn">
    <strong>Korrigert:</strong> Husbankens tilskudd til <em>utleieboliger</em> er avviklet (ingen ny tilsagnsramme 2026).
    Nav deltar med egeninnsats — ikke som Husbanken-søker. Bufdir 2026-fristen er utløpt.
  </div>

  <p style="font-size:8pt;margin:0 0 6pt;"><strong>Samlet potensial (3 år):</strong> ca. 2–18 MNOK — primært via IPN, supplert av SkatteFUNN, Oppstartstilskudd 1 og eventuelt Husbanken/Bufdir 2027.</p>

  <h2>Dette ber vi partnerne om</h2>
  <div class="ask-box">
    <h3>Til UiT Narvik (Aker Nscale Innovation Centre)</h3>
    <p>Bekreft <strong>FoU-leverandør-rolle</strong> i IPN-søknad: AI/ML-kompetanse, fairness-validering og publiseringsansvar. Vi trenger <strong>støttebrev eller intensjonsavtale innen september 2026</strong>.</p>
    <p><strong>UiT får:</strong> 3–5 publikasjoner, reell samfunnsutfordring, PhD-tema, industriell relevans via Aker Nscale-miljøet.</p>
  </div>
  <div class="ask-box">
    <h3>Til Nav Narvik</h3>
    <p>Bekreft <strong>domenepartner-rolle</strong>: sosialfaglig kompetanse, tilgang til målgruppe for intervjuer/testing, og pilotmiljø for KI-modulen. <strong>Støttebrev innen september 2026.</strong></p>
    <p><strong>Nav får:</strong> Digitalt verktøy som senker terskelen for første kontakt og kobler unge til riktig saksbehandler — integrert i eksisterende Boly-samarbeid.</p>
  </div>

  <h2>Neste steg</h2>
  <div class="steps">
    <div class="step"><strong>1. Oppstartsmøte</strong><span>UiT + Nav + Gamechanging · mandat og roller · juli–august 2026</span></div>
    <div class="step"><strong>2. Støttebrev</strong><span>Signerte intensjonsavtaler fra begge partnere · september 2026</span></div>
    <div class="step"><strong>3. IPN-søknad</strong><span>Gamechanging koordinerer full søknad · høst 2026 · før prosjektstart</span></div>
  </div>

  <div class="footer-note">
    Side 2 av 2 · Kilder: forskningsradet.no · husbanken.no (tilskudd boligtiltak, frist 15. mai) · innovasjonnorge.no/oppstartstilskudd-1 · bufdir.no · uit.no/nyheter/artikkel?p_document_id=914863 (Aker Nscale)
  </div>
</section>

</body>
</html>`;

const chrome = '/usr/local/bin/google-chrome';
if (!existsSync(chrome)) {
  console.error('Chrome not found');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  const buf = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  writeFileSync(outPdf, buf);
  writeFileSync(publicPdf, buf);
  console.log('Wrote', outPdf, '(' + buf.length + ' bytes)');
} finally {
  await browser.close();
}
