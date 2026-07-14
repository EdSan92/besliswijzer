import { expect, test } from '@playwright/test'
import { isApiHealthy } from './helpers/api'

test.describe('Admin', () => {
  test.beforeEach(async ({ request }) => {
    const healthy = await isApiHealthy(request)
    test.skip(!healthy, 'API niet bereikbaar — start de API (poort 3001)')
  })

  test('toont flowbeheer in development', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Flows & categorieën' })).toBeVisible()
    await expect(page.getByText('warmtepomp-keuzehulp')).toBeVisible()
  })

  test('loginpagina is bereikbaar', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.getByRole('heading', { name: 'Besliswijzer Admin' })).toBeVisible()
    await expect(page.getByLabel('Wachtwoord')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Inloggen' })).toBeVisible()
  })
})
