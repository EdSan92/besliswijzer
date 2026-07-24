import { expect, test } from '@playwright/test'
import { isFlowPublished } from './helpers/api'

const FLOW_SLUG = 'robotmaaiers'
const PAGE_SLUG = 'robotmaaier-kiezen'

async function isProductPagePublished(
  request: Parameters<typeof isFlowPublished>[0],
  slug: string,
): Promise<boolean> {
  try {
    const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'
    const response = await request.get(`${apiBase}/api/v1/public/pages/${slug}`, {
      timeout: 10_000,
    })
    return response.ok()
  } catch {
    return false
  }
}

test.describe('Robotmaaier keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Robotmaaier-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt klein-tuin pad tot instap-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await expect(page.getByRole('heading', { name: 'Hoe groot is het gazon?' })).toBeVisible()

    await page.getByRole('button', { name: 'Klein (tot 300 m²)' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Vlak (tot 10% helling)' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Open en overzichtelijk' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Lage prijs' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Ja, dichtbij het gazon' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Geen probleem' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await expect(
      page.getByRole('heading', { name: 'Advies per e-mail ontvangen?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Overslaan' }).click()

    await expect(page.getByRole('heading', { name: 'Instap robotmaaier' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bekijk instapmodellen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meer over robotmaaiers' })).toHaveAttribute(
      'href',
      `/${PAGE_SLUG}`,
    )
  })

  test('blokkeert volgende stap zonder keuze', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    const nextButton = page.getByRole('button', { name: 'Volgende' })
    await expect(nextButton).toBeDisabled()
  })
})

test.describe('Robotmaaier SEO-pagina', () => {
  test.beforeEach(async ({ request }) => {
    const pageAvailable = await isProductPagePublished(request, PAGE_SLUG)
    test.skip(!pageAvailable, 'Robot productpagina niet beschikbaar — run pnpm db:seed')
  })

  test('toont ingebedde keuzehulp op productpagina', async ({ page }) => {
    await page.goto(`/${PAGE_SLUG}`)

    await expect(
      page.getByRole('heading', { name: 'Welke robotmaaier past bij jouw tuin?' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hoe groot is het gazon?' })).toBeVisible()
  })
})
