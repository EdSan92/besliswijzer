import { expect, type Page } from '@playwright/test'

type AnswerFlowQuestionParams = {
  question: string
  option: string
  nextQuestion?: string
}

function isFlowStepResponse(url: string, method: string): boolean {
  return (
    method === 'POST' &&
    url.includes('/api/v1/public/flows/') &&
    url.includes('/step')
  )
}

export async function answerFlowQuestion(
  page: Page,
  { question, option, nextQuestion }: AnswerFlowQuestionParams,
): Promise<void> {
  await expect(page.getByRole('heading', { name: question })).toBeVisible()

  const optionButton = page.getByRole('button', { name: option })
  await expect(optionButton).toBeVisible()
  await optionButton.click()

  const nextButton = page.getByRole('button', { name: 'Volgende' })
  await expect(nextButton).toBeEnabled()

  const stepCompleted = page.waitForResponse(
    (response) => isFlowStepResponse(response.url(), response.request().method()),
    { timeout: 20_000 },
  )
  await nextButton.click()
  const stepResponse = await stepCompleted
  expect(stepResponse.ok(), `Flow step request failed with status ${stepResponse.status()}`).toBeTruthy()

  if (nextQuestion) {
    await expect(page.getByRole('heading', { name: nextQuestion })).toBeVisible()
  }
}

export async function skipLeadCapture(page: Page, nextHeading: string): Promise<void> {
  const stepCompleted = page.waitForResponse(
    (response) => isFlowStepResponse(response.url(), response.request().method()),
    { timeout: 20_000 },
  )
  await page.getByRole('button', { name: 'Overslaan' }).click()
  const stepResponse = await stepCompleted
  expect(stepResponse.ok(), `Lead step request failed with status ${stepResponse.status()}`).toBeTruthy()
  await expect(page.getByRole('heading', { name: nextHeading })).toBeVisible()
}
