import { expect, type Page } from '@playwright/test'

type AnswerFlowQuestionParams = {
  question: string
  option: string
  nextQuestion?: string
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
  await nextButton.click()

  if (nextQuestion) {
    await expect(page.getByRole('heading', { name: nextQuestion })).toBeVisible()
  }
}
