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
<title>Kunstig intelligens i sosial boligformidling</title>
<style>${css}</style>
</head>
<body>

<section class="page">
  <div class="topbar">
    <div class="logo"><img src="data:image/png;base64,${logoB64}" alt="Gamechanging" /></div>
    <div class="meta">
      <div class="kicker">Partnerproposisjon · Juli 2026</div>
      <strong>Gamechanging AS</strong><br>
      Org.nr. 932 496 321<br>
      oskar@gamechanging.no<br>
      +46 70 149 09 81
    </div>
  </div>

  <h1>Kunstig intelligens i sosial boligformidling</h1>
  <p class="subtitle">Forslag til forskningssamarbeid om hvordan kunstig intelligens kan støtte kontakt mellom unge i utenforskap og sosial boligformidling</p>

  <div class="lead">
    <strong>Essensen:</strong> Mange unge (16–25) i utenforskap tar ikke kontakt med Nav fordi det av ulike grunner oppleves som vanskelig for dem.
    <strong>Digital Los</strong> er en planlagt førstekontaktflate med støtte fra kunstig intelligens: naturlig språk, lav terskel og kobling til riktig saksbehandler, med bolig som inngangsport.
    Løsningen skal bygges som modul på <strong>Boly</strong> (bolynorge.no), utviklet i samarbeid med Nav Narvik.
  </div>

  <div class="stats">
    <div class="stat"><strong>FoU</strong><span>Forskningsbasert</span></div>
    <div class="stat"><strong>24–36 mnd</strong><span>Planlagt varighet</span></div>
    <div class="stat"><strong>3</strong><span>Samarbeidspartnere</span></div>
    <div class="stat"><strong>16–25 år</strong><span>Målgruppe</span></div>
  </div>

  <h2>Bakgrunn</h2>
  <div class="grid-2">
    <div class="card">
      <h3>Utfordringen</h3>
      <p>En stor andel unge står utenfor arbeid og utdanning. Uten trygg bolig blir det vanskeligere å stabilisere livssituasjonen, være i arbeid og utvikle sosiale nettverk.</p>
      <p>Nav og kommune bruker mye ressurser på oppsøkende arbeid. Likevel når ikke alle som trenger hjelp til bolig.</p>
      <p>Utfordringen er kjent også i Narvik: Mange unge med boligbehov tar ikke kontakt, ofte fordi de ikke vet hvor de skal henvende seg eller opplever systemet som krevende.</p>
    </div>
    <div class="card">
      <h3>Digital Los i tre steg</h3>
      <ul>
        <li><strong>Kontakt:</strong> enkel dialog (chat) på vanlig norsk, med lav terskel i første møte</li>
        <li><strong>Forståelse:</strong> strukturert kartlegging av behov, med dataminimering</li>
        <li><strong>Kobling:</strong> forslag til riktig saksbehandler, alltid med menneske involvert</li>
      </ul>
      <p style="margin-top:4pt;font-size:8pt;color:#64748b;">Modulen er et forslag til utprøving, ikke en ferdig løsning.</p>
    </div>
  </div>

  <h2>Forskningsspørsmål</h2>
  <table>
    <tr><th>#</th><th>Spørsmål</th><th>Foreslått metode</th></tr>
    <tr><td>F1</td><td>Hvilke KI-løsninger kan senke terskelen for første kontakt og dialog mellom unge og lokale Nav-veiledere?</td><td>Prototypetesting, kvalitative intervjuer</td></tr>
    <tr><td>F2</td><td>Hvordan utvikle løsningen ansvarlig (GDPR, AI Act)?</td><td>DPIA, risikovurdering, fairness-vurdering</td></tr>
    <tr><td>F3</td><td>Hvilken effekt har løsningen på boligformidling og oppfølging?</td><td>Evaluering i pilot, der det er etisk og praktisk forsvarlig</td></tr>
  </table>

  <h2>Samarbeidspartnere</h2>
  <table>
    <tr><th>Partner</th><th>Foreslått rolle</th><th>Bidrag</th></tr>
    <tr><td><strong>Gamechanging AS</strong></td><td>Prosjektansvarlig</td><td>Boly-plattform, teknisk utvikling, koordinering</td></tr>
    <tr><td><strong>UiT Narvik</strong></td><td>Forskningspartner</td><td>Metode, evaluering, ansvarlig KI, veiledning</td></tr>
    <tr><td><strong>Nav Narvik</strong></td><td>Domenepartner</td><td>Faglig innspill, realistisk arbeidsflyt, eventuelt pilotmiljø</td></tr>
  </table>
  <p style="font-size:7.8pt;color:#64748b;margin:4pt 0 0;">Dokumentet inviterer til dialog, ikke bindende forpliktelser. Omfang og form avtales felles etter oppstartsmøte.</p>

  <div class="partners">
    <span class="pill">Gamechanging AS</span>
    <span class="pill">UiT Narvik</span>
    <span class="pill">Nav Narvik</span>
    <span class="pill">Boly · bolynorge.no</span>
  </div>

  <div class="footer-note">Side 1 av 2 · Kunstig intelligens i sosial boligformidling · Gamechanging AS</div>
</section>

<section class="page">
  <div class="topbar">
    <div class="logo"><img src="data:image/png;base64,${logoB64}" alt="Gamechanging" /></div>
    <div class="meta">
      <strong>Kontakt</strong><br>
      Oskar Høgmo-Utstøl<br>
      oskar@gamechanging.no<br>
      +46 70 149 09 81
    </div>
  </div>

  <h2>Dette ber vi partnerne om</h2>
  <div class="ask-box">
    <h3>Til UiT Narvik</h3>
    <p>Vi ønsker en uforpliktende samtale om forskningspartnerrolle: AI/ML, ansvarlig KI, evaluering og eventuell publisering. UiT kan bidra med metode og faglig kvalitet i et prosjekt med tydelig samfunnsnytte.</p>
    <p><strong>Vi håper UiT kan:</strong> nominere kontaktperson, delta i oppstartsmøte, og vurdere å inngå som partner.</p>
  </div>
  <div class="ask-box">
    <h3>Til Nav Narvik</h3>
    <p>Vi ønsker Nav som domenepartner med sosialfaglig kompetanse og innsikt i hvordan boligformidling fungerer i praksis. Dersom det er hensiktsmessig, kan Nav bidra med pilotmiljø og kontakt med målgruppen ved behovskartlegging.</p>
    <p><strong>Vi håper Nav kan:</strong> gi faglig tilbakemelding på forslaget, delta i oppstartsmøte, og vurdere å inngå som partner.</p>
    <p style="font-size:8pt;color:#475569;margin-top:4pt;">Målet er et verktøy som støtter saksbehandler, ikke erstatter faglig skjønn eller lovpålagte vurderinger.</p>
  </div>

  <h2>Personvern og etikk</h2>
  <div class="grid-2">
    <div class="card">
      <ul>
        <li>Dataminimering og tydelig samtykke</li>
        <li>DPIA før eventuell pilot</li>
        <li>Forklarbare anbefalinger til saksbehandler</li>
      </ul>
    </div>
    <div class="card">
      <ul>
        <li>Ingen trening på personsensitive data uten grunnlag</li>
        <li>Menneske involvert ved alle viktige beslutninger</li>
        <li>Nav/kommune som behandlingsansvarlig der det gjelder</li>
      </ul>
    </div>
  </div>

  <h2>Foreslått videre løp</h2>
  <table>
    <tr><th>Milepæl</th><th>Periode</th><th>Innhold</th></tr>
    <tr><td><strong>1. Oppstartsmøte</strong></td><td>August–september 2026</td><td>UiT, Nav og Gamechanging avklarer mandat, roller og omfang</td></tr>
    <tr><td><strong>2. Behovskartlegging</strong></td><td>Oktober–november 2026</td><td>Intervjuer med saksbehandlere og, der mulig, unge i målgruppen</td></tr>
    <tr><td><strong>3. Felles prosjektplan</strong></td><td>Desember 2026</td><td>Enighet om videre samarbeid og innhold i forskningssøknad</td></tr>
    <tr><td><strong>4. Innsendt søknad</strong></td><td>Januar–mars 2027</td><td>Felles forskningssøknad sendes inn (målsetning)</td></tr>
  </table>

  <div class="ask-box" style="margin-top:9pt;background:#f8fafc;">
    <h3>Kontakt</h3>
    <p><strong>Oskar Høgmo-Utstøl</strong> · Gamechanging AS<br>
    oskar@gamechanging.no · +46 70 149 09 81<br>
    Vi tar gjerne et kort møte for å presentere idéen og høre deres innspill.</p>
  </div>

  <div class="footer-note">
    Side 2 av 2 · Kunstig intelligens i sosial boligformidling · Gamechanging AS · oskar@gamechanging.no
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
