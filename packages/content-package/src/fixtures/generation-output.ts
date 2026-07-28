import airfryerContent from './airfryer-content-package.json' with { type: 'json' }

export const validGenerationOutput = {
  content: airfryerContent,
  internalLinks: [
    {
      slug: 'robotstofzuigers',
      title: 'Robotstofzuiger keuzehulp',
      reason: 'Gerelateerde keuken- en huishoudcategorie',
    },
  ],
  claims: [
    {
      id: 'capacity-rule',
      text: 'Reken op ongeveer 1 liter per persoon voor een volledige maaltijd.',
      requiresSource: true,
    },
  ],
  warnings: [
    {
      code: 'NEEDS_VERIFICATION',
      field: 'claims.capacity-rule',
      message: 'Capacity guidance is derived from flowbrief buying criteria, not independently verified',
    },
  ],
}

export const invalidGenerationOutput = {
  content: {
    slug: 'a',
    intro: '',
    buyingGuide: '',
    faq: [],
    metadata: {
      title: 'Kort',
      description: 'Te kort',
    },
  },
  internalLinks: [],
  claims: [],
  warnings: [],
}
