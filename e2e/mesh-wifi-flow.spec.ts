import { expect, test } from '@playwright/test'
import { answerFlowQuestion, skipLeadCapture } from './helpers/flow-wizard'
import { isFlowPublished, isProductPagePublished } from './helpers/api'

const FLOW_SLUG = 'mesh-wifi'
const PAGE_SLUG = 'mesh-wifi-kiezen'

test.describe('Mesh wifi keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Mesh wifi-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt appartement/instappad tot instap-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Wat voor woning heb je?',
      option: 'Appartement',
      nextQuestion: 'Hoe groot is je woonoppervlak?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe groot is je woonoppervlak?',
      option: 'Klein (tot 80 m²)',
      nextQuestion: 'Hoeveel verdiepingen moet wifi dekken?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoeveel verdiepingen moet wifi dekken?',
      option: 'Één verdieping',
      nextQuestion: 'Welke internetsnelheid heb je (of verwacht je)?',
    })

    await answerFlowQuestion(page, {
      question: 'Welke internetsnelheid heb je (of verwacht je)?',
      option: 'Tot 100 Mbps',
      nextQuestion: 'Kun je nodes bekabelen (Ethernet backhaul)?',
    })

    await answerFlowQuestion(page, {
      question: 'Kun je nodes bekabelen (Ethernet backhaul)?',
      option: 'Nee, alleen draadloos',
      nextQuestion: 'Uit welk materiaal bestaan vooral je muren en vloeren?',
    })

    await answerFlowQuestion(page, {
      question: 'Uit welk materiaal bestaan vooral je muren en vloeren?',
      option: 'Hout en gipsplaten',
      nextQuestion: 'Hoeveel apparaten gebruiken tegelijk wifi?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoeveel apparaten gebruiken tegelijk wifi?',
      option: 'Tot 10 apparaten',
      nextQuestion: 'Waarvoor gebruik je internet het meest?',
    })

    await answerFlowQuestion(page, {
      question: 'Waarvoor gebruik je internet het meest?',
      option: 'Surfen, mail en streaming',
      nextQuestion: 'Welke wifi-generatie heb je nodig?',
    })

    await answerFlowQuestion(page, {
      question: 'Welke wifi-generatie heb je nodig?',
      option: 'Wi-Fi 5 is voldoende',
      nextQuestion: 'Wil je ouderlijk toezicht of gastnetwerk?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je ouderlijk toezicht of gastnetwerk?',
      option: 'Nee, niet nodig',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: 'Tot €150',
      nextQuestion: 'Advies per e-mail ontvangen?',
    })

    await skipLeadCapture(page, 'Instap mesh wifi-set')

    await expect(page.getByRole('link', { name: 'Bekijk instap mesh sets' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meer over mesh wifi' })).toHaveAttribute(
      'href',
      `/${PAGE_SLUG}`,
    )
  })

  test('doorloopt groot-huis/backhaulpad tot backhaul-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Wat voor woning heb je?',
      option: 'Vrijstaande woning',
      nextQuestion: 'Hoe groot is je woonoppervlak?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoe groot is je woonoppervlak?',
      option: 'Groot (meer dan 150 m²)',
      nextQuestion: 'Hoeveel verdiepingen moet wifi dekken?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoeveel verdiepingen moet wifi dekken?',
      option: 'Drie of meer verdiepingen',
      nextQuestion: 'Welke internetsnelheid heb je (of verwacht je)?',
    })

    await answerFlowQuestion(page, {
      question: 'Welke internetsnelheid heb je (of verwacht je)?',
      option: 'Meer dan 500 Mbps',
      nextQuestion: 'Kun je nodes bekabelen (Ethernet backhaul)?',
    })

    await answerFlowQuestion(page, {
      question: 'Kun je nodes bekabelen (Ethernet backhaul)?',
      option: 'Ja, bekabeling is gewenst/verplicht',
      nextQuestion: 'Uit welk materiaal bestaan vooral je muren en vloeren?',
    })

    await answerFlowQuestion(page, {
      question: 'Uit welk materiaal bestaan vooral je muren en vloeren?',
      option: 'Veel beton of staal',
      nextQuestion: 'Hoeveel apparaten gebruiken tegelijk wifi?',
    })

    await answerFlowQuestion(page, {
      question: 'Hoeveel apparaten gebruiken tegelijk wifi?',
      option: 'Meer dan 25 apparaten',
      nextQuestion: 'Waarvoor gebruik je internet het meest?',
    })

    await answerFlowQuestion(page, {
      question: 'Waarvoor gebruik je internet het meest?',
      option: 'Gaming of veel videobellen',
      nextQuestion: 'Welke wifi-generatie heb je nodig?',
    })

    await answerFlowQuestion(page, {
      question: 'Welke wifi-generatie heb je nodig?',
      option: 'Wi-Fi 6 gewenst',
      nextQuestion: 'Wil je ouderlijk toezicht of gastnetwerk?',
    })

    await answerFlowQuestion(page, {
      question: 'Wil je ouderlijk toezicht of gastnetwerk?',
      option: 'Nee, niet nodig',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: 'Meer dan €300',
      nextQuestion: 'Advies per e-mail ontvangen?',
    })

    await skipLeadCapture(page, 'Mesh wifi met bekabelde backhaul')

    await expect(page.getByRole('link', { name: 'Bekijk backhaul-vriendelijke sets' })).toBeVisible()
  })
})

test.describe('Mesh wifi SEO-pagina', () => {
  test.beforeEach(async ({ request }) => {
    const pageAvailable = await isProductPagePublished(request, PAGE_SLUG)
    test.skip(!pageAvailable, 'Mesh wifi productpagina niet beschikbaar — run pnpm db:seed')
  })

  test('toont ingebedde keuzehulp op productpagina', async ({ page }) => {
    await page.goto(`/${PAGE_SLUG}`)

    await expect(
      page.getByRole('heading', { name: 'Vind het ideale mesh wifi systeem voor jouw woning' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Koopcriteria' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nodes en backhaul uitgelegd' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Wat voor woning heb je?' })).toBeVisible()
  })
})
