import airfryerBrief from './airfryer-flowbrief.json' with { type: 'json' }

export const validGenerationOutput = {
  brief: airfryerBrief,
  warnings: [
    {
      code: 'MISSING_SOURCE',
      field: 'metadata.problem',
      message: 'Problem statement is based on keyword research only',
    },
  ],
}

export const invalidGenerationOutput = {
  brief: {
    slug: 'airfryers',
    title: 'Airfryer keuzehulp',
    metadata: {
      targetAudience: 'Huishoudens',
      problem: 'Keuze',
      searchIntent: 'commercial',
    },
    questions: [
      {
        questionKey: 'budget',
        title: 'Budget?',
        inputType: 'single',
        options: [{ optionKey: 'a', label: 'A', value: 'a' }],
      },
    ],
    results: [],
  },
}
