import { expect, test } from '@playwright/test'
import { isFlowPublished, isProductPagePublished } from './helpers/api'
import { answerFlowQuestion } from './helpers/flow-wizard'

const FLOW_SLUG = 'robotmaaiers'
const PAGE_SLUG = 'robotmaaier-kiezen'

test.describe('Robotmaaier keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Robotmaaier-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt klein-tuin pad tot instap-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Hoe groot is het gazon?',
      option: 'Klein (tot 300 m²)',
      nextQuestion: 'Hoe steil is het terrein?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe steil is het terrein?',
      option: 'Vlak (tot 10% helling)',
      nextQuestion: 'Hoe complex is de tuin?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe complex is de tuin?',
      option: 'Open en overzichtelijk',
      nextQuestion: 'Wat is voor jou het belangrijkst?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is voor jou het belangrijkst?',
      option: 'Lage prijs',
      nextQuestion: 'Heb je stroom in de tuin?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je stroom in de tuin?',
      option: 'Ja, dichtbij het gazon',
      nextQuestion: 'Wil je zelf kabels leggen?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je zelf kabels leggen?',
      option: 'Geen probleem',
      nextQuestion: 'Advies per e-mail ontvangen?',
    })

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
