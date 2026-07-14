import { expect, test } from '@playwright/test'
import { isFlowPublished } from './helpers/api'

const FLOW_SLUG = 'warmtepomp-keuzehulp'

test.describe('Warmtepomp keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const available = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!available, 'Flow niet beschikbaar — start Postgres en run pnpm db:seed')
  })

  test('doorloopt appartement-pad tot persoonlijk advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await expect(page.getByRole('heading', { name: 'Wat voor woning heb je?' })).toBeVisible()

    await page.getByRole('button', { name: 'Appartement' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await expect(page.getByRole('heading', { name: 'Hoe goed is je isolatie?' })).toBeVisible()
    await page.getByRole('button', { name: 'Goed (dakisolatie + HR++)' }).click()
    await page.getByRole('button', { name: 'Volgende' }).click()

    await expect(
      page.getByRole('heading', { name: 'Wil je je advies per e-mail ontvangen?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Overslaan' }).click()

    await expect(
      page.getByRole('heading', { name: 'All-electric warmtepomp geschikt' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bekijk warmtepompen' })).toBeVisible()
  })

  test('blokkeert volgende stap zonder keuze', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    const nextButton = page.getByRole('button', { name: 'Volgende' })
    await expect(nextButton).toBeDisabled()
  })
})
