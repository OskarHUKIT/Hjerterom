/**
 * UX/UI audit for live Hjerterum deployments.
 * Run: PLAYWRIGHT_BASE_URL=https://hjerterom-phi.vercel.app npx playwright test e2e/ux-ui-audit.spec.ts
 */
import { test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'
const PASSWORD = process.env.AUDIT_PASSWORD ?? 'Ofoten2026!'

type Finding = {
  severity: 'pass' | 'warn' | 'fail' | 'info'
  area: string
  detail: string
}

const findings: Finding[] = []

function record(severity: Finding['severity'], area: string, detail: string) {
  findings.push({ severity, area, detail })
}

async function acceptCookies(page: Page) {
  const accept = page.getByRole('button', { name: /godta alle|accept all/i })
  if ((await accept.count()) > 0) await accept.click()
  await page.waitForTimeout(400)
}

async function login(page: Page, email: string, loginPath = '/login') {
  await page.goto(loginPath, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(1500)
  await acceptCookies(page)
  await page.locator('input[type="email"], input[autocomplete="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(4000)
}

test.describe.configure({ mode: 'serial', timeout: 60_000 })
test.use({ viewport: { width: 1280, height: 800 } })

test('public routes and theme baseline', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await acceptCookies(page)

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (theme === 'dark') {
    record('pass', 'Theme', 'Home loads with data-theme="dark" (Boly dark default)')
  } else {
    record('fail', 'Theme', `Home data-theme="${theme}" — expected dark default`)
  }

  const skipLink = await page.locator('.hrt-skip-link, a[href="#main-content"]').first().textContent()
  if (skipLink?.trim() === 'skipToMain') {
    record('fail', 'i18n', 'Skip link shows raw key "skipToMain" — missing no/se/en translation keys')
  } else if (skipLink) {
    record('pass', 'i18n', `Skip link translated: "${skipLink.trim()}"`)
  }

  const publicRoutes = ['/', '/finn', '/los', '/login', '/finn/login', '/personvern', '/brukervilkar']
  for (const route of publicRoutes) {
    const res = await page.request.get(route)
    const status = res.status()
    if (status < 500) record('pass', 'Routes', `${route} → HTTP ${status}`)
    else record('fail', 'Routes', `${route} → HTTP ${status}`)
  }
})

test('Finn public — dark theme, language, mobile', async ({ page }) => {
  await page.goto('/finn', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await acceptCookies(page)

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (theme === 'dark') record('pass', 'Finn', 'Finn loads dark by default')
  else record('fail', 'Finn', `Finn theme is "${theme}" — should be dark`)

  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  record('info', 'Finn', `Body background: ${bodyBg} (token --bg-app #020617)`)

  const langSelect = page.locator('select[aria-label], .shell-chrome-controls__select')
  if ((await langSelect.count()) > 0) record('pass', 'Finn', 'Language selector (no/se/en) visible on Finn')
  else record('warn', 'Finn', 'Language selector not found on Finn search page')

  const themeBtn = page.locator('button[aria-label*="mode" i], .shell-chrome-controls__theme').first()
  if ((await themeBtn.count()) > 0) {
    const before = theme
    await themeBtn.click()
    await page.waitForTimeout(800)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (before !== after) record('pass', 'Finn', `Theme toggle works on Finn: ${before} → ${after}`)
    else record('fail', 'Finn', 'Theme toggle present but did not change data-theme')
  } else {
    record('fail', 'Finn', 'Theme toggle not found on Finn (PRD §15 — required on all shells)')
  }

  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  if (scrollWidth <= clientWidth + 2) record('pass', 'Mobile', 'Finn — no horizontal scroll at 375px')
  else record('fail', 'Mobile', `Finn — horizontal scroll at 375px (${scrollWidth}px > ${clientWidth}px)`)
})

test('Los public — dark theme and controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/los', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await acceptCookies(page)

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  if (theme === 'dark') record('pass', 'Los', 'Los loads dark by default')
  else record('fail', 'Los', `Los theme is "${theme}" — should be dark`)

  const themeBtn = page.locator('button[aria-label*="mode" i], .shell-chrome-controls__theme').first()
  if ((await themeBtn.count()) > 0) record('pass', 'Los', 'Theme toggle visible on Los')
  else record('warn', 'Los', 'Theme toggle not found on Los landing')
})

test('Ops login — ops@demo.ofoten.no', async ({ page }) => {
  await login(page, 'ops@demo.ofoten.no')
  await page.waitForURL((url) => !url.pathname.endsWith('/login') && !url.pathname.endsWith('/login/'), {
    timeout: 15_000,
  }).catch(() => undefined)
  const url = page.url()
  if (url.includes('/ops')) {
    record('pass', 'Auth/Ops', 'Ops login redirected to /ops')
  } else if (url.includes('/homeowner/register')) {
    record('pass', 'Auth/Ops', 'Ops login OK → /homeowner/register (landlord onboarding gate before /ops home)')
  } else if (url.includes('/login')) {
    record('fail', 'Auth/Ops', 'Ops login failed — still on login page')
  } else {
    record('info', 'Auth/Ops', `Ops login landed on ${url}`)
  }

  await page.goto('/ops', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const opsUrl = page.url()
  if (opsUrl.includes('/ops')) record('pass', 'Ops', '/ops accessible after ops@demo.ofoten.no login')
  else record('fail', 'Ops', `/ops blocked or redirected → ${opsUrl}`)

  await page.goto('/ops/platform', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const platformUrl = page.url()
  if (platformUrl.includes('/ops/platform')) {
    record('pass', 'Ops', '/ops/platform loads for ops account')
    const title = await page.locator('h1, h2').first().textContent()
    record('info', 'Ops', `/ops/platform heading: ${title?.trim() ?? '(none)'}`)
  } else {
    record('fail', 'Ops', `/ops/platform not accessible → ${platformUrl}`)
  }
})

test('Kommune login — tina.olsen@demo.ofoten.no', async ({ page }) => {
  await page.context().clearCookies()
  await login(page, 'tina.olsen@demo.ofoten.no')
  const url = page.url()
  if (url.includes('/nav/')) record('pass', 'Auth/Kommune', `Kommune admin login OK → ${url}`)
  else if (url.includes('/login')) record('fail', 'Auth/Kommune', 'Kommune admin login failed')
  else record('info', 'Auth/Kommune', `Kommune admin login → ${url}`)

  await page.goto('/nav/database', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  if (page.url().includes('/nav/database')) record('pass', 'Nav', '/nav/database accessible for kommune admin')
  else record('fail', 'Nav', `/nav/database → ${page.url()}`)

  await page.goto('/nav/los-inbox', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  if (page.url().includes('/nav/los-inbox')) record('pass', 'Nav', '/nav/los-inbox accessible')
  else record('warn', 'Nav', `/nav/los-inbox → ${page.url()} (module may be off)`)
})

test('Utleier login — tommy.hakonsen@demo.ofoten.no', async ({ page }) => {
  await page.context().clearCookies()
  await login(page, 'tommy.hakonsen@demo.ofoten.no')
  const url = page.url()
  if (url.includes('/homeowner/manage')) record('pass', 'Auth/Utleier', 'Utleier login → /homeowner/manage')
  else if (!url.includes('/login')) record('info', 'Auth/Utleier', `Utleier login → ${url}`)
  else record('fail', 'Auth/Utleier', 'Utleier login failed')

  if (page.url().includes('/homeowner/manage')) {
    const heading = await page.locator('h1, h2').first().textContent()
    record('info', 'Homeowner', `Manage page heading: ${heading?.trim() ?? '(none)'}`)
  }
})

test('Leietaker login — emma.becker@demo.ofoten.no via Finn', async ({ page }) => {
  await page.context().clearCookies()
  await login(page, 'emma.becker@demo.ofoten.no', '/finn/login')
  const url = page.url()
  if (url.includes('/finn/mine')) record('pass', 'Auth/Leietaker', 'Leietaker Finn login → /finn/mine')
  else if (!url.includes('/login')) record('pass', 'Auth/Leietaker', `Leietaker Finn login OK → ${url}`)
  else record('fail', 'Auth/Leietaker', 'Leietaker Finn login failed')

  await page.goto('/finn/mine', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  if (page.url().includes('/finn/mine')) record('pass', 'Finn', '/finn/mine accessible for leietaker')
  else record('warn', 'Finn', `/finn/mine → ${page.url()}`)
})

test('Kommune header chrome — theme and locale on Boly App', async ({ page }) => {
  await page.context().clearCookies()
  await login(page, 'lars.moen@demo.ofoten.no')
  await page.goto('/nav/database', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const themeBtn = page.locator(
    'button[aria-label*="mode" i], button[aria-label*="mørk" i], button[aria-label*="lys" i], button[aria-label*="modus" i]'
  ).first()
  if ((await themeBtn.count()) > 0) {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    await themeBtn.click()
    await page.waitForTimeout(800)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (before !== after) record('pass', 'Nav', `Theme toggle on /nav: ${before} → ${after}`)
    else record('fail', 'Nav', 'Theme toggle on /nav did not change data-theme')
  } else {
    record('warn', 'Nav', 'Theme toggle not found in Boly App header at 1280px (check mobile menu / bottom nav)')
  }

  const localeSelect = page.locator('select').filter({ has: page.locator('option[value="se"]') }).first()
  if ((await localeSelect.count()) > 0) {
    await localeSelect.selectOption('se')
    await page.waitForTimeout(1500)
    const heading = await page.locator('h1, h2').first().textContent()
    record('info', 'i18n', `Nav heading after locale=se: "${heading?.trim() ?? ''}"`)
    if (heading && !/boligbank/i.test(heading)) record('pass', 'i18n', 'Sámi locale changes nav copy')
    else record('warn', 'i18n', 'Nav heading unchanged after switching to se — verify Sámi keys for boligbank')
  } else {
    record('warn', 'i18n', 'Locale selector with se option not found on /nav/database')
  }
})

test.afterAll(async () => {
  const outDir = path.resolve(__dirname, '../../docs/hjerterum')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, 'UX_UI_AUDIT_RESULTS.txt')

  const counts = {
    pass: findings.filter((f) => f.severity === 'pass').length,
    warn: findings.filter((f) => f.severity === 'warn').length,
    fail: findings.filter((f) => f.severity === 'fail').length,
    info: findings.filter((f) => f.severity === 'info').length,
  }

  const lines = [
    'HJERTERUM UX/UI AUDIT RESULTS',
    '================================',
    `Date: ${new Date().toISOString()}`,
    `Target: ${BASE}`,
    'Auditor: /ux-ui-audit (Playwright e2e/ux-ui-audit.spec.ts)',
  '',
    'Test accounts (documented in docs/hjerterum/DEMO_NARVIK_OFOTEN.md):',
    '  Password: Ofoten2026! for all @demo.ofoten.no accounts',
    '  ops@demo.ofoten.no — platform operator',
    '  tina.olsen@demo.ofoten.no — kommune admin',
    '  lars.moen@demo.ofoten.no — kommune saksbehandler',
    '  tommy.hakonsen@demo.ofoten.no — utleier (5 boliger)',
    '  emma.becker@demo.ofoten.no — leietaker (Finn)',
  '',
    'Summary',
    '-------',
    `PASS: ${counts.pass}`,
    `WARN: ${counts.warn}`,
    `FAIL: ${counts.fail}`,
    `INFO: ${counts.info}`,
  '',
    'Findings',
    '--------',
    ...findings.map((f) => `[${f.severity.toUpperCase()}] ${f.area}: ${f.detail}`),
  '',
    'Recommended follow-ups (from failures/warnings)',
    '----------------------------------------------',
    ...findings
      .filter((f) => f.severity === 'fail' || f.severity === 'warn')
      .map((f) => `- [${f.severity.toUpperCase()}] ${f.area}: ${f.detail}`),
  '',
    'Audit criteria: docs/hjerterum/UI_UX_GOVERNANCE.md §6.2, .cursor/skills/hjerterum-ui/SKILL.md',
    '',
  ]

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
  console.log(`\nAudit results written to ${outFile}`)
})
