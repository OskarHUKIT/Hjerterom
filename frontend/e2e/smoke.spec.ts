/**
 * Wave 6 smoke stub — verifies core routes respond without 5xx.
 * Protected routes may redirect (302/307) to login; that still counts as "route exists".
 *
 * Run: npm run test:e2e (requires build + @playwright/test)
 */
import { test, expect } from '@playwright/test'

const SMOKE_ROUTES = [
  { path: '/homeowner/manage', label: 'landlord manage' },
  { path: '/nav/database', label: 'nav database' },
  { path: '/nav/messages', label: 'nav messages' },
  { path: '/finn', label: 'finn search' },
] as const

for (const route of SMOKE_ROUTES) {
  test(`${route.label} (${route.path}) responds`, async ({ request }) => {
    const response = await request.get(route.path, { maxRedirects: 0 })
    const status = response.status()
    expect(status, `unexpected status for ${route.path}`).toBeLessThan(500)
    expect([200, 301, 302, 303, 307, 308]).toContain(status)
  })
}
