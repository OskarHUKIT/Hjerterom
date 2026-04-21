import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdPath = resolve(__dirname, 'DBA_Gamechanging_Boly_v3.md');
const cssPath = resolve(__dirname, '.dba_pdf_style.css');
const pdfPath = resolve(__dirname, 'DBA_Gamechanging_Boly_v3.pdf');

const md = readFileSync(mdPath, 'utf8');
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

marked.setOptions({ gfm: true, breaks: false });
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<title>Databehandleravtale — Boly</title>
<style>${css}</style>
</head>
<body>
<main class="dba">
${body}
</main>
</body>
</html>`;

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = chromeCandidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Edge found.');
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
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
}

console.log('Wrote', pdfPath);
