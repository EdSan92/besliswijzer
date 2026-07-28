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
  claims: [],
  warnings: [],
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
