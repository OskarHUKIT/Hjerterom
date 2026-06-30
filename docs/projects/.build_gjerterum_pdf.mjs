import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = resolve(__dirname, 'Gjerterum_Digital_Lukket_Del_Rapport_Soknad.md');
const cssPath = resolve(__dirname, '.gjerterum_pdf_style.css');
const pdfPath = resolve(__dirname, 'Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf');
const publicPdfPath = resolve(
  __dirname,
  '../../frontend/public/Gjerterum_Digital_Lukket_Del_Rapport_Soknad.pdf',
);

const md = readFileSync(mdPath, 'utf8');
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

marked.setOptions({ gfm: true, breaks: false });
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<title>Gjerterum — digital lukket del</title>
<style>${css}</style>
</head>
<body>
<main class="gjerterum-report">
${body}
</main>
</body>
</html>`;

const chromeCandidates = [
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = chromeCandidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Chromium found.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120_000 });
  const pdfBuffer = await page.pdf({
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;color:#64748b;text-align:center;padding:0 16mm;"><span>Gjerterum — digital lukket del · Gamechanging AS · Side <span class="pageNumber"></span> av <span class="totalPages"></span></span></div>',
    margin: { top: '18mm', bottom: '22mm', left: '0', right: '0' },
    preferCSSPageSize: true,
  });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(pdfPath, pdfBuffer);
  writeFileSync(publicPdfPath, pdfBuffer);
} finally {
  await browser.close();
}

console.log('Wrote', pdfPath);
console.log('Wrote', publicPdfPath);
