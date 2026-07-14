import { expect, test } from '@playwright/test'

test.describe('Opportunity Discovery', () => {
  test('toont discovery UI met actieknoppen', async ({ page }) => {
    await page.goto('/opportunities')

    await expect(page.getByRole('heading', { name: 'Opportunity Discovery' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start discovery' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Genereer flows/i })).toBeVisible()
  })
})
