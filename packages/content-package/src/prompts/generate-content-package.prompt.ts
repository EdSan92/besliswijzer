import type { ContentPackageGenerationInput } from '../types.js'

const OUTPUT_SHAPE = `{
  "content": {
    "slug": "category-slug",
    "intro": "...",
    "buyingGuide": "...",
    "faq": [{ "question": "...", "answer": "..." }],
    "metadata": { "title": "...", "description": "..." }
  },
  "internalLinks": [
    { "slug": "related-slug", "title": "...", "reason": "..." }
  ],
  "claims": [
    {
      "id": "claim-id",
      "text": "...",
      "sourceId": "optional-source-id",
      "requiresSource": true
    }
  ],
  "warnings": [
    { "code": "NEEDS_VERIFICATION", "field": "claims.claim-id", "message": "..." }
  ]
}`

export function buildGenerateContentPackagePrompt(
  input: ContentPackageGenerationInput,
  promptVersion: string,
): string {
  return [
    `Prompt version: ${promptVersion}`,
    'Genereer een SEO-contentpakket als strikt JSON-object.',
    'Gebruik geen vrije tekst buiten het JSON-object.',
    'Zet feitelijke claims zonder bron in claims met requiresSource=true en voeg een warning toe.',
    'Geen rankingbeloftes, geen onbewezen productsuperlatieven, geen placeholder-tekst.',
    `Categorie: ${input.categoryTitle} (${input.categorySlug})`,
    `Taal: ${input.language}`,
    input.searchIntent ? `Zoekintentie: ${input.searchIntent}` : undefined,
    input.keywordVariants?.length
      ? `Keyword varianten: ${input.keywordVariants.join(', ')}`
      : undefined,
    input.questions?.length ? `Gerelateerde vragen: ${input.questions.join(' | ')}` : undefined,
    input.buyingCriteria?.length
      ? `Koopcriteria: ${input.buyingCriteria.join(', ')}`
      : undefined,
    input.existingRoutes?.length
      ? `Bestaande routes voor interne links: ${input.existingRoutes.join(', ')}`
      : undefined,
    `JSON-vorm:\n${OUTPUT_SHAPE}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildRepairContentPackagePrompt(
  input: ContentPackageGenerationInput,
  promptVersion: string,
  invalidOutput: unknown,
  errors: string[],
): string {
  return [
    buildGenerateContentPackagePrompt(input, promptVersion),
    'Herstel de vorige output zodat deze valide is.',
    'Geef maximaal één herstelde JSON-response.',
    `Validatiefouten:\n${errors.map((error) => `- ${error}`).join('\n')}`,
    `Vorige output:\n${JSON.stringify(invalidOutput).slice(0, 4000)}`,
  ].join('\n\n')
}
