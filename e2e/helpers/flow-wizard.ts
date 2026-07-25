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
    (response) => isFlowStepResponse(response.url(), response.request().method()) && response.ok(),
  )
  await nextButton.click()
  await stepCompleted

  if (nextQuestion) {
    await expect(page.getByRole('heading', { name: nextQuestion })).toBeVisible()
  }
}
