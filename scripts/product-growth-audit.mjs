#!/usr/bin/env node
/**
 * Product growth audit runner for Hjerterum staging/production.
 * Framework: PRD §11, PRODUKTANALYSE_AKTORER, UI_UX_GOVERNANCE §6, MARKEDSPLAN gaps.
 *
 * Usage:
 *   node scripts/product-growth-audit.mjs --base-url https://hjerterom-phi.vercel.app
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const require = createRequire(join(ROOT, 'frontend/package.json'))
const { chromium } = require('playwright')

const BASE_URL = (() => {
  const idx = process.argv.indexOf('--base-url')
  return idx >= 0 ? process.argv[idx + 1] : 'https://hjerterom-phi.vercel.app'
})()

const PASSWORD = 'Ofoten2026!'

const PERSONAS = [
  {
    id: 'ops',
    email: 'ops@demo.ofoten.no',
    label: 'Ops / plattformdrift',
    postLoginPaths: ['/ops', '/ops/platform', '/ops/events', '/ops/kommuner', '/ops/stats'],
  },
  {
    id: 'kommune_admin',
    email: 'tina.olsen@demo.ofoten.no',
    label: 'Kommune admin',
    postLoginPaths: ['/nav/database', '/nav/los-inbox', '/nav/event-inquiries', '/nav/terms-documents', '/nav/kommune-access'],
  },
  {
    id: 'kommune_sb',
    email: 'lars.moen@demo.ofoten.no',
    label: 'Kommune saksbehandler',
    postLoginPaths: ['/nav/database', '/nav/messages', '/nav/los-inbox', '/nav/users'],
  },
  {
    id: 'event_sb',
    email: 'kari.event@demo.ofoten.no',
    label: 'Event saksbehandler',
    postLoginPaths: ['/nav/event-inquiries', '/nav/database'],
  },
  {
    id: 'landlord',
    email: 'ingrid.fotland@demo.ofoten.no',
    label: 'Utleier (turisme)',
    postLoginPaths: ['/homeowner/manage', '/nav/messages'],
  },
  {
    id: 'guest',
    email: 'emma.becker@demo.ofoten.no',
    label: 'Leietaker (Finn)',
    loginPath: '/login',
    postLoginPaths: ['/finn', '/finn/mine'],
  },
]

const PUBLIC_ROUTES = [
  { path: '/', label: 'Landing' },
  { path: '/login', label: 'Login' },
  { path: '/finn', label: 'Finn søk' },
  { path: '/finn/vilkar', label: 'Finn vilkår' },
  { path: '/finn/arrangement/arctic-ski-narvik-2026', label: 'Finn arrangement' },
  { path: '/los', label: 'Digital Los' },
  { path: '/los/personvern', label: 'Los personvern' },
]

const lines = []
const findings = { pass: [], warn: [], fail: [], info: [] }

function log(section, text) {
  lines.push(text)
  console.log(text)
}

function record(level, code, message) {
  findings[level].push({ code, message })
}

function heading(title) {
  log('heading', '')
  log('heading', '='.repeat(72))
  log('heading', title)
  log('heading', '='.repeat(72))
}

function subheading(title) {
  log('sub', '')
  log('sub', `--- ${title} ---`)
}

async function checkRoute(page, path, context = '') {
  const url = `${BASE_URL}${path}`
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  const status = response?.status() ?? 0
  const title = await page.title().catch(() => '')
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '')
  const hasError = /error|feil|noe gikk galt|something went wrong/i.test(bodyText.slice(0, 2000))
  const is5xx = status >= 500
  const ok = status > 0 && status < 500 && !hasError

  if (is5xx || hasError) {
    record('fail', `ROUTE_${path}`, `${context}${path} → HTTP ${status}${hasError ? ' + error copy' : ''}`)
  } else if (status >= 400) {
    record('warn', `ROUTE_${path}`, `${context}${path} → HTTP ${status}`)
  } else {
    record('pass', `ROUTE_${path}`, `${context}${path} → HTTP ${status}`)
  }

  return { ok, status, title, bodySnippet: bodyText.slice(0, 400).replace(/\s+/g, ' ').trim() }
}

async function login(page, persona) {
  const loginPath = persona.loginPath ?? '/login'
  try {
    await page.goto(`${BASE_URL}${loginPath}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  } catch (err) {
    record('fail', `LOGIN_${persona.id}`, `${persona.email} — navigation to ${loginPath} failed: ${err.message}`)
    return false
  }
  await page.waitForTimeout(1500)

  const emailInput = page.locator('input[type="email"], input#login-email, input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  if ((await emailInput.count()) === 0) {
    record('fail', `LOGIN_${persona.id}`, `No email field on ${loginPath}`)
    return false
  }

  await emailInput.fill(persona.email)
  await passwordInput.fill(PASSWORD)

  const submit = page.locator('button[type="submit"], .hrt-login-submit').first()
  await submit.click()

  await page.waitForTimeout(4000)

  const url = page.url()
  const body = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')
  const stillOnLogin =
    (url.includes('/login') && !url.includes('/homeowner') && !url.includes('/nav') && !url.includes('/ops') && !url.includes('/finn/mine')) ||
    url.endsWith('/finn/login')
  const authError = /ugyldig|invalid credentials|feil passord|wrong password|email not confirmed|ikke bekreftet/i.test(body)

  if (stillOnLogin || authError) {
    record('fail', `LOGIN_${persona.id}`, `${persona.email} — login failed (url=${url})`)
    return false
  }

  record('pass', `LOGIN_${persona.id}`, `${persona.email} → ${url}`)
  return true
}

async function checkThemeToggle(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(1200)
  const themeBtn = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme" i], button[aria-label*="tema" i], .hrt-theme-toggle, [title*="tema" i]').first()
  const count = await themeBtn.count()
  if (count === 0) {
    record('warn', `THEME_${path}`, `No theme toggle found on ${path}`)
    return { hasToggle: false }
  }
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await themeBtn.click()
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (before === after) {
    record('warn', `THEME_${path}`, `Theme toggle present but data-theme unchanged (${before})`)
  } else {
    record('pass', `THEME_${path}`, `Theme toggled ${before} → ${after} on ${path}`)
  }
  return { hasToggle: true, before, after }
}

async function checkLanguageSelector(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForTimeout(1200)
  const lang = page.locator('[data-testid="language-selector"], .hrt-lang, button[aria-label*="språk" i], select[aria-label*="language" i]').first()
  const count = await lang.count()
  if (count === 0) {
    record('warn', `I18N_${path}`, `No language selector on ${path}`)
    return false
  }
  record('pass', `I18N_${path}`, `Language selector visible on ${path}`)
  return true
}

async function runAudit() {
  heading('HJERTERUM PRODUCT GROWTH AUDIT')
  log('meta', `Date: ${new Date().toISOString()}`)
  log('meta', `Target: ${BASE_URL}`)
  log('meta', `Framework: PRD §11 metrics, PRODUKTANALYSE_AKTORER, UI_UX_GOVERNANCE §6, MARKEDSPLAN`)
  log('meta', `Test accounts: @demo.ofoten.no (password documented in DEMO_NARVIK_OFOTEN.md)`)
  log('meta', `Auditor: automated Playwright + manual checklist synthesis`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'nb-NO',
  })
  const page = await context.newPage()

  subheading('1. Public route health')
  for (const route of PUBLIC_ROUTES) {
    const result = await checkRoute(page, route.path)
    log('route', `${result.ok ? 'PASS' : 'FAIL'} ${route.label} (${route.path}) — HTTP ${result.status}`)
    if (result.bodySnippet) log('route', `  snippet: ${result.bodySnippet.slice(0, 180)}…`)
  }

  subheading('2. Theme & i18n (growth UX gates)')
  for (const path of ['/', '/finn', '/los', '/login']) {
    await checkThemeToggle(page, path)
    await checkLanguageSelector(page, path)
  }

  subheading('3. Persona login + core journeys')
  for (const persona of PERSONAS) {
    log('persona', '')
    log('persona', `Persona: ${persona.label} (${persona.email})`)
    const loggedIn = await login(page, persona)
    if (!loggedIn) {
      log('persona', '  SKIP post-login routes — auth failed')
      continue
    }
    for (const path of persona.postLoginPaths) {
      const result = await checkRoute(page, path, `${persona.id}: `)
      log('persona', `  ${result.ok ? 'PASS' : 'FAIL'} ${path} — HTTP ${result.status}`)
    }
    await context.clearCookies()
  }

  subheading('4. Growth funnel surfaces (anonymous)')
  const finnResult = await checkRoute(page, '/finn')
  const losResult = await checkRoute(page, '/los')
  if (/søk|search|dato|kart|map|finn/i.test(finnResult.bodySnippet)) {
    record('pass', 'FUNNEL_FINN', 'Finn loads; search/map UI may hydrate client-side')
    log('funnel', 'PASS Finn funnel entry — client-side search expected after hydration')
  } else record('warn', 'FUNNEL_FINN', 'Finn lacks obvious search affordances in initial HTML')

  if (/chat|los|snakk|hjelp|digital/i.test(losResult.bodySnippet)) {
    record('pass', 'FUNNEL_LOS', 'Los loads; chat UI may hydrate client-side')
    log('funnel', 'PASS Los funnel entry — client-side chat expected after hydration')
  } else record('warn', 'FUNNEL_LOS', 'Los lacks obvious chat affordances in initial HTML')

  subheading('5. Product growth gap checklist (static vs live)')
  const staticGaps = [
    ['GUEST_INBOX', 'Leietaker↔utleier meldingstråd per booking', 'P0 per PRODUKTANALYSE — not verified in this pass'],
    ['INSTANT_BOOK', 'tourism_instant_book i produksjon', 'Verify landlord + Finn booking flow manually'],
    ['EVENT_STAFF_UI', 'event_ansatt dedikert UI', 'Partial — event SB uses nav routes'],
    ['STRIPE_VIPPS', 'Stripe + Vipps parallelt', 'Config-dependent on phi env'],
    ['SAMI_GATE', '100% se keys on new strings', 'Requires i18n key audit — not automated here'],
    ['FIRST_BOOK_WINS', 'Dobbelbooking-beskyttelse', 'Requires concurrent booking test'],
  ]
  for (const [code, item, note] of staticGaps) {
    record('info', code, `${item}: ${note}`)
    log('gap', `INFO  ${item} — ${note}`)
  }

  await browser.close()

  subheading('6. Summary')
  log('summary', `PASS: ${findings.pass.length}`)
  log('summary', `WARN: ${findings.warn.length}`)
  log('summary', `FAIL: ${findings.fail.length}`)
  log('summary', `INFO: ${findings.info.length}`)

  if (findings.fail.length) {
    log('summary', '')
    log('summary', 'Critical failures:')
    for (const f of findings.fail) log('summary', `  [${f.code}] ${f.message}`)
  }
  if (findings.warn.length) {
    log('summary', '')
    log('summary', 'Warnings:')
    for (const f of findings.warn) log('summary', `  [${f.code}] ${f.message}`)
  }

  const outDir = join(ROOT, 'docs/hjerterum/audits')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, 'PRODUCT_GROWTH_AUDIT_RESULTS.txt')
  writeFileSync(outFile, lines.join('\n') + '\n', 'utf8')
  log('meta', '')
  log('meta', `Results written to: ${outFile}`)

  return findings.fail.length > 0 ? 1 : 0
}

runAudit()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err)
    process.exit(2)
  })
