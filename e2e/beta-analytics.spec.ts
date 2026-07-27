import { expect, test } from '@playwright/test'
import { API_BASE, isFlowPublished, isProductPagePublished } from './helpers/api'

const FLOW_SLUG = 'robotstofzuigers'
const SEO_SLUG = 'robotstofzuiger-kiezen'
const RESULT_KEY = 'advies_huisdieren'
const SITEMAP_FLOW_SLUG = 'warmtepomp-keuzehulp'

test.describe('Beta analytics', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    const pageAvailable = await isProductPagePublished(request, SEO_SLUG)
    test.skip(!flowAvailable || !pageAvailable, 'Seed data niet beschikbaar — run pnpm db:seed')
  })

  test('registreert analytics events en affiliateklik zonder navigatie te blokkeren', async ({
    page,
    request,
  }) => {
    let analyticsPosts = 0
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/public/analytics/events')) {
        analyticsPosts += 1
      }
    })

    await page.goto(`/${SEO_SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto(`/flows/${FLOW_SLUG}`)
    await expect(page.getByRole('heading').first()).toBeVisible()

    await expect.poll(() => analyticsPosts, { timeout: 15_000 }).toBeGreaterThan(0)

    await page.goto(`/flows/${FLOW_SLUG}/result/${RESULT_KEY}`)
    const affiliateLink = page.locator('a[href*="/api/v1/public/affiliate/click"]').first()
    await expect(affiliateLink).toBeVisible()

    const href = await affiliateLink.getAttribute('href')
    expect(href).toContain('flowSlug=')
    expect(href).not.toMatch(/[?&]url=/)

    const popupPromise = page.waitForEvent('popup')
    await affiliateLink.click()
    const popup = await popupPromise
    await expect(popup).toHaveURL(/https?:\/\//)

    const response = await request.get(`${API_BASE}/api/v1/admin/analytics/beta-report`, {
      headers: { 'x-admin-key': process.env.ADMIN_API_KEY ?? 'ci-admin-key' },
    })
    expect(response.ok()).toBeTruthy()
  })

  test('biedt sitemap en robots voor indexeerbaarheid', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
    const sitemapBody = await sitemap.text()
    expect(sitemapBody).toContain(`/${SEO_SLUG}`)
    expect(sitemapBody).toContain(`/flows/${SITEMAP_FLOW_SLUG}`)

    const robots = await request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    const robotsBody = await robots.text()
    expect(robotsBody).toContain('Allow: /')
    expect(robotsBody).toContain('Sitemap:')
  })
})
