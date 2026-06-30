import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'HJERTERUM_rapport.html');
const cssPath = resolve(__dirname, 'hjerterum_rapport.css');
const pdfPath = resolve(__dirname, 'HJERTERUM_Visjonsrapport.pdf');

const htmlRaw = readFileSync(htmlPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');

const html = htmlRaw.replace(
  '<link rel="stylesheet" href="hjerterum_rapport.css" />',
  `<style>${css}</style>`
);

const executablePath =
  process.env.CHROME_PATH ||
  '/opt/google/chrome/chrome';

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120_000 });
  await page.evaluateHandle('document.fonts.ready');
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log('PDF skrevet:', pdfPath);
} finally {
  await browser.close();
}
