/**
 * Register stepper E2E — walks 5 steps and publishes a listing.
 *
 * Requires live auth + Supabase (demo/staging):
 *   PLAYWRIGHT_LIVE_AUTH=1 PLAYWRIGHT_BASE_URL=https://hjerterom-phi.vercel.app npm run test:e2e:register
 *
 * Optional: E2E_REGISTER_EMAIL (default tommy.hakonsen@demo.ofoten.no)
 */
import { test, expect, type Page } from '@playwright/test'

const PASSWORD = process.env.AUDIT_PASSWORD ?? 'Ofoten2026!'
const LANDLORD_EMAIL = process.env.E2E_REGISTER_EMAIL ?? 'tommy.hakonsen@demo.ofoten.no'
const LIVE = process.env.PLAYWRIGHT_LIVE_AUTH === '1'

async function acceptCookies(page: Page) {
  const accept = page.getByRole('button', { name: /godta alle|accept all/i })
  if ((await accept.count()) > 0) await accept.click()
}

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 60_000 })
  await acceptCookies(page)
  await page.locator('input[type="email"], input[autocomplete="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/(homeowner|login)/, { timeout: 30_000 })
}

async function mockGeonorge(page: Page) {
  await page.route('**/ws.geonorge.no/adresser/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        adresser: [
          {
            adressetekst: 'E2E Testveien 99',
            postnummer: '8514',
            poststed: 'Narvik',
            kommunenavn: 'Narvik',
            representasjonspunkt: { lat: 68.4381, lon: 17.4272 },
          },
        ],
      }),
    })
  })
}

test.describe('Register stepper', () => {
  test.skip(!LIVE, 'Set PLAYWRIGHT_LIVE_AUTH=1 with Supabase-backed deployment')

  test('creates listing through 5-step stepper', async ({ page }) => {
    test.setTimeout(120_000)
    await mockGeonorge(page)
    await login(page, LANDLORD_EMAIL)

    await page.goto('/homeowner/register', { waitUntil: 'networkidle' })
    await acceptCookies(page)

    await expect(page.getByRole('heading', { name: /registrer|register/i })).toBeVisible()

    const uniqueSuffix = Date.now()
    await page.getByLabel(/navn|name/i).first().fill(`E2E Utleier ${uniqueSuffix}`)
    await page.locator('input[type="tel"]').first().fill('+47 900 00 000')
    await page.getByPlaceholder(/gate|street/i).first().fill(`E2E Testveien ${uniqueSuffix}`)
    await page.getByPlaceholder(/post|8514/i).first().fill('8514')
    await page.getByPlaceholder(/kommune|city|narvik/i).first().fill('Narvik')
    await page.waitForTimeout(800)

    await page.locator('input[type="number"]').nth(0).fill('45')
    await page.locator('input[type="number"]').nth(1).fill('2')
    await page.locator('input[type="number"]').nth(2).fill('3')
    await page.locator('input[type="number"]').nth(3).fill('650')

    await page.getByRole('button', { name: /neste|next|čuovvovaš/i }).click()

    await page.getByRole('button', { name: /neste|next|čuovvovaš/i }).click()

    await page.getByRole('button', { name: /neste|next|čuovvovaš/i }).click()

    const summerPreset = page.getByRole('button', { name: /sommer|summer/i })
    if ((await summerPreset.count()) > 0) {
      await summerPreset.first().click()
      const applyBtn = page.getByRole('button', { name: /bruk|apply|lagre/i })
      if ((await applyBtn.count()) > 0) await applyBtn.first().click()
    }
    await page.getByRole('button', { name: /neste|next|čuovvovaš/i }).click()

    await page.locator('.register-insurance-checkbox, input[type="checkbox"]').last().check()
    await page.getByRole('button', { name: /publiser|publish|almmuh/i }).click()

    await page.waitForURL(/\/homeowner\/listings\/[0-9a-f-]+/, { timeout: 60_000 })
    await expect(page).toHaveURL(/\/homeowner\/listings\//)
  })
})
