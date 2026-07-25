import { expect, test } from '@playwright/test'
import { answerFlowQuestion, skipLeadCapture } from './helpers/flow-wizard'
import { isFlowPublished, isProductPagePublished } from './helpers/api'

const FLOW_SLUG = 'robotstofzuigers'
const PAGE_SLUG = 'robotstofzuiger-kiezen'

test.describe('Robotstofzuiger keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Robotstofzuiger-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt huisdierenpad tot huisdieren-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Welk type vloer heb je voornamelijk?',
      option: 'Mix van vloertypes',
      nextQuestion: 'Heb je huisdieren?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je huisdieren?',
      option: 'Ja, huisdieren',
      nextQuestion: 'Hoe hoog zijn drempels en tapijtranden?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe hoog zijn drempels en tapijtranden?',
      option: 'Laag (tot 1 cm)',
      nextQuestion: 'Hoe groot is het te reinigen oppervlak?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe groot is het te reinigen oppervlak?',
      option: 'Middel (80–150 m²)',
      nextQuestion: 'Moet de robot meerdere verdiepingen kunnen?',
    })

    await answerFlowQuestion(page, {
      question: 'Moet de robot meerdere verdiepingen kunnen?',
      option: 'Nee, één verdieping',
      nextQuestion: 'Wil je ook dweilen?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je ook dweilen?',
      option: 'Nee, alleen stofzuigen',
      nextQuestion: 'Hoe belangrijk is slimme obstakelherkenning?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe belangrijk is slimme obstakelherkenning?',
      option: 'Basis is voldoende',
      nextQuestion: 'Wil je een automatisch leegstation?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je een automatisch leegstation?',
      option: 'Nee',
      nextQuestion: 'Hoe belangrijk is een stille robot?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe belangrijk is een stille robot?',
      option: 'Normaal geluidsniveau is oké',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: '€300 – €500',
      nextQuestion: 'Advies per e-mail ontvangen?',
    })

    await expect(
      page.getByRole('heading', { name: 'Advies per e-mail ontvangen?' }),
    ).toBeVisible()
    await skipLeadCapture(page, 'Robotstofzuiger voor huisdieren')

    await expect(page.getByRole('link', { name: 'Bekijk modellen voor huisdieren' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meer over robotstofzuigers' })).toHaveAttribute(
      'href',
      `/${PAGE_SLUG}`,
    )
  })

  test('doorloopt dweilpad tot dweil-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Welk type vloer heb je voornamelijk?',
      option: 'Hout, tegels of laminaat',
      nextQuestion: 'Heb je huisdieren?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je huisdieren?',
      option: 'Nee',
      nextQuestion: 'Hoe hoog zijn drempels en tapijtranden?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe hoog zijn drempels en tapijtranden?',
      option: 'Middel (1–2 cm)',
      nextQuestion: 'Hoe groot is het te reinigen oppervlak?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe groot is het te reinigen oppervlak?',
      option: 'Groot (meer dan 150 m²)',
      nextQuestion: 'Moet de robot meerdere verdiepingen kunnen?',
    })

    await answerFlowQuestion(page, {
      question: 'Moet de robot meerdere verdiepingen kunnen?',
      option: 'Ja, meerdere verdiepingen',
      nextQuestion: 'Wil je ook dweilen?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je ook dweilen?',
      option: 'Ja, stofzuigen én dweilen',
      nextQuestion: 'Hoe belangrijk is slimme obstakelherkenning?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe belangrijk is slimme obstakelherkenning?',
      option: 'Premium navigatie gewenst',
      nextQuestion: 'Wil je een automatisch leegstation?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je een automatisch leegstation?',
      option: 'Nee',
      nextQuestion: 'Hoe belangrijk is een stille robot?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe belangrijk is een stille robot?',
      option: 'Zo stil mogelijk',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: 'Meer dan €500',
      nextQuestion: 'Advies per e-mail ontvangen?',
    })

    await skipLeadCapture(page, 'Robotstofzuiger met dweilfunctie')

    await expect(page.getByRole('link', { name: "Bekijk dweil-combo's" })).toBeVisible()
  })
})

test.describe('Robotstofzuiger SEO-pagina', () => {
  test.beforeEach(async ({ request }) => {
    const pageAvailable = await isProductPagePublished(request, PAGE_SLUG)
    test.skip(!pageAvailable, 'Robotstofzuiger productpagina niet beschikbaar — run pnpm db:seed')
  })

  test('toont ingebedde keuzehulp op productpagina', async ({ page }) => {
    await page.goto(`/${PAGE_SLUG}`)

    await expect(
      page.getByRole('heading', { name: 'Vind de ideale robotstofzuiger voor jouw woning' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Koopcriteria' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gebruiksscenario\'s' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Welk type vloer heb je voornamelijk?' })).toBeVisible()
  })
})
