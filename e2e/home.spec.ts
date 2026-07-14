import { expect, test } from '@playwright/test'

test.describe('Homepage', () => {
  test('toont landing page met navigatie', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Veraio|Besliswijzer/i)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('heeft link naar een keuzehulp', async ({ page }) => {
    await page.goto('/')

    const flowLink = page.locator('a[href^="/flows/"]').first()
    await expect(flowLink).toBeVisible()
  })
})
