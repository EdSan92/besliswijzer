import { expect, test } from '@playwright/test'
import { answerFlowQuestion } from './helpers/flow-wizard'
import { isFlowPublished, isProductPagePublished } from './helpers/api'

const FLOW_SLUG = 'thuisbatterijen'
const PAGE_SLUG = 'thuisbatterij-kiezen'

test.describe('Thuisbatterij keuzehulp', () => {
  test.beforeEach(async ({ request }) => {
    const flowAvailable = await isFlowPublished(request, FLOW_SLUG)
    test.skip(!flowAvailable, 'Thuisbatterij-flow niet beschikbaar — run pnpm db:seed')
  })

  test('doorloopt zonnepanelenpad tot zonnepanelen-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Heb je zonnepanelen?',
      option: 'Ja',
      nextQuestion: 'Wat is je jaarverbruik ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je jaarverbruik ongeveer?',
      option: 'Hoog (meer dan 4.500 kWh)',
      nextQuestion: 'Wat wil je bereiken met een thuisbatterij?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat wil je bereiken met een thuisbatterij?',
      option: 'Eigen opgewekte stroom \'s avonds gebruiken',
      nextQuestion: 'Heb je een dynamisch energiecontract?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je een dynamisch energiecontract?',
      option: 'Ja',
      nextQuestion: 'Waar kan de batterij geplaatst worden?',
    })

    await answerFlowQuestion(page, {
      question: 'Waar kan de batterij geplaatst worden?',
      option: 'Buiten (gevel, schuur)',
      nextQuestion: 'Heb je al een omvormer of thuisaccu?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je al een omvormer of thuisaccu?',
      option: 'Ja, ik weet het merk/type',
      nextQuestion: 'Wat past het beste bij je?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat past het beste bij je?',
      option: 'All-in-one systeem',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: '€5.000 – €10.000',
    })

    await expect(page.getByRole('heading', { name: 'Thuisbatterij voor zonnepanelen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bekijk zonnepanelen-thuisbatterijen' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Meer over thuisbatterijen' })).toHaveAttribute(
      'href',
      `/${PAGE_SLUG}`,
    )
  })

  test('doorloopt backuppad tot noodstroom-advies', async ({ page }) => {
    await page.goto(`/flows/${FLOW_SLUG}`)

    await answerFlowQuestion(page, {
      question: 'Heb je zonnepanelen?',
      option: 'Nee',
      nextQuestion: 'Wat is je jaarverbruik ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je jaarverbruik ongeveer?',
      option: 'Hoog (meer dan 4.500 kWh)',
      nextQuestion: 'Wat wil je bereiken met een thuisbatterij?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat wil je bereiken met een thuisbatterij?',
      option: 'Noodstroom bij stroomuitval',
      nextQuestion: 'Heb je een dynamisch energiecontract?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je een dynamisch energiecontract?',
      option: 'Nee',
      nextQuestion: 'Waar kan de batterij geplaatst worden?',
    })

    await answerFlowQuestion(page, {
      question: 'Waar kan de batterij geplaatst worden?',
      option: 'Binnen (garage, meterkast)',
      nextQuestion: 'Heb je al een omvormer of thuisaccu?',
    })

    await answerFlowQuestion(page, {
      question: 'Heb je al een omvormer of thuisaccu?',
      option: 'Nee, nog geen systeem',
      nextQuestion: 'Wat past het beste bij je?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat past het beste bij je?',
      option: 'All-in-one systeem',
      nextQuestion: 'Wat is je budget ongeveer?',
    })

    await answerFlowQuestion(page, {
      question: 'Wat is je budget ongeveer?',
      option: '€5.000 – €10.000',
    })

    await expect(page.getByRole('heading', { name: 'Thuisbatterij voor noodstroom' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bekijk backup-thuisbatterijen' })).toBeVisible()
  })
})

test.describe('Thuisbatterij SEO-pagina', () => {
  test.beforeEach(async ({ request }) => {
    const pageAvailable = await isProductPagePublished(request, PAGE_SLUG)
    test.skip(!pageAvailable, 'Thuisbatterij productpagina niet beschikbaar — run pnpm db:seed')
  })

  test('toont ingebedde keuzehulp op productpagina', async ({ page }) => {
    await page.goto(`/${PAGE_SLUG}`)

    await expect(
      page.getByRole('heading', { name: 'Vind de ideale thuisbatterij voor jouw situatie' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Koopcriteria' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'kWh-capaciteit en omvormercompatibiliteit' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Heb je zonnepanelen?' })).toBeVisible()
  })
})
