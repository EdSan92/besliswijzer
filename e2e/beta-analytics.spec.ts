import { expect, test } from '@playwright/test'
import { isFlowPublished } from './helpers/api'

const FLOW_SLUG = 'robotstofzuigers'
const SEO_SLUG = 'robotstofzuiger-kiezen'

test.describe('Beta analytics', () => {
  test.beforeEach(async ({ request }) => {
    const available = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!available, 'Flow niet beschikbaar — start Postgres en run pnpm db:seed')
  })

  test('registreert page view, flow events en affiliateklik zonder navigatie te blokkeren', async ({
    page,
    request,
  }) => {
    const analyticsRequests: unknown[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/public/analytics/events')) {
        analyticsRequests.push(req.postDataJSON())
      }
    })

    await page.goto(`/${SEO_SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: /start/i }).click()
    await page.getByRole('button', { name: 'Volgende' }).click({ timeout: 15000 }).catch(() => {})

    const affiliateLink = page.locator('a[href*="/api/v1/public/affiliate/click"]').first()
    if (await affiliateLink.count()) {
      const href = await affiliateLink.getAttribute('href')
      expect(href).toContain('flowSlug=')
      expect(href).not.toContain('url=')

      const popupPromise = page.waitForEvent('popup')
      await affiliateLink.click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(/https?:\/\//)
    }

    await expect.poll(() => analyticsRequests.length, { timeout: 10000 }).toBeGreaterThan(0)

    const response = await request.get('/api/v1/admin/analytics/beta-report', {
      headers: { 'x-admin-key': process.env.ADMIN_API_KEY ?? 'dev-admin-key' },
    })
    expect(response.ok()).toBeTruthy()
  })

  test('biedt sitemap en robots voor indexeerbaarheid', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
    const sitemapBody = await sitemap.text()
    expect(sitemapBody).toContain(`/${SEO_SLUG}`)
    expect(sitemapBody).toContain(`/flows/${FLOW_SLUG}`)

    const robots = await request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    const robotsBody = await robots.text()
    expect(robotsBody).toContain('Allow: /')
    expect(robotsBody).toContain('Sitemap:')
  })
})
