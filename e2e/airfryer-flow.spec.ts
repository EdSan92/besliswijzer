import { expect, test } from '@playwright/test'
import { isFlowPublished, isProductPagePublished } from './helpers/api'

const FLOW_SLUG = 'airfryers'
const PAGE_SLUG = 'airfryer-kiezen'

test.describe('Airfryer keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Airfryer-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt compact budget pad tot instap-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await expect(page.getByRole('heading', { name: 'Voor hoeveel personen kook je meestal?' })).toBeVisible()

    await page.getByRole('button', { name: '1–2 personen' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Af en toe' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Compact (3–4 liter)' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Nee, één mand is genoeg' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Weinig ruimte' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Tot €75' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await page.getByRole('button', { name: 'Vooral bakken en frituren' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await expect(
      page.getByRole('heading', { name: 'Advies per e-mail ontvangen?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Overslaan' }).click()

    await expect(page.getByRole('heading', { name: 'Compacte instap-airfryer' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bekijk instap-airfryers' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meer over airfryers' })).toHaveAttribute(
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

test.describe('Airfryer SEO-pagina', () => {
  test.beforeEach(async ({ request }) => {
    const pageAvailable = await isProductPagePublished(request, PAGE_SLUG)
    test.skip(!pageAvailable, 'Airfryer productpagina niet beschikbaar — run pnpm db:seed')
  })

  test('toont ingebedde keuzehulp op productpagina', async ({ page }) => {
    await page.goto(`/${PAGE_SLUG}`)

    await expect(
      page.getByRole('heading', { name: 'Vind de ideale airfryer voor jouw keuken' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Voor hoeveel personen kook je meestal?' })).toBeVisible()
  })
})
