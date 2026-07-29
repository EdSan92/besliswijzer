import type { FlowBriefGenerationInput } from '../types.js'

const OUTPUT_SHAPE = `{
  "brief": {
    "slug": "category-slug",
    "title": "Keuzehulp titel",
    "categorySlug": "optional-category-slug",
    "seo": { "title": "...", "description": "..." },
    "metadata": {
      "targetAudience": "...",
      "problem": "...",
      "searchIntent": "...",
      "exclusions": [],
      "buyingCriteria": [],
      "requiredProductFields": []
    },
    "questions": [
      {
        "questionKey": "budget",
        "title": "...",
        "description": "...",
        "inputType": "single",
        "decisionPurpose": "...",
        "options": [{ "optionKey": "a", "label": "...", "value": "a" }]
      }
    ],
    "decisionRules": [
      {
        "fromQuestionKey": "budget",
        "condition": { "==": [{ "var": "answers.budget" }, "tot_75"] },
        "targetResultKey": "advies_instap",
        "priority": 100
      }
    ],
    "results": [
      {
        "resultKey": "advies",
        "title": "...",
        "body": { "summary": "..." },
        "ctas": [
          {
            "id": "cta-main",
            "type": "affiliate",
            "url": "https://example.com/product",
            "label": "Bekijk aanbevelingen",
            "trackingId": "aff-main"
          }
        ]
      }
    ],
    "includeLeadCapture": false
  },
  "warnings": [
    { "code": "UNVERIFIED_CLAIM", "field": "metadata.problem", "message": "..." }
  ]
}`

export function buildGenerateFlowBriefPrompt(
  input: FlowBriefGenerationInput,
  promptVersion: string,
): string {
  return [
    `Prompt version: ${promptVersion}`,
    'Genereer een flowbrief als strikt JSON-object.',
    'Gebruik geen vrije tekst buiten het JSON-object.',
    'Gebruik voor ctas.type alleen: affiliate, download of external (nooit link).',
    'Elke cta heeft verplicht id, type, url (geldige https-URL), label.',
    'decisionRules gebruiken fromQuestionKey plus condition als JSON-object (geen string).',
    'Zorg dat elke vraag via decisionRules een pad heeft naar minstens één result.',
    'Voeg een fallback-regel met lege condition {} toe per vraag indien nodig.',
    'Gebruik lege arrays alleen wanneer echt niets van toepassing is.',
    'Zet onzekere claims of ontbrekende bronnen in warnings; noem geen onbewezen productfeiten als feiten in brief.',
    'Iedere vraag moet een expliciet decisionPurpose hebben.',
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
    `JSON-vorm:\n${OUTPUT_SHAPE}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildRepairFlowBriefPrompt(
  input: FlowBriefGenerationInput,
  promptVersion: string,
  invalidOutput: unknown,
  errors: string[],
): string {
  return [
    buildGenerateFlowBriefPrompt(input, promptVersion),
    'Herstel de vorige output zodat deze valide is.',
    'Geef maximaal één herstelde JSON-response.',
    `Validatiefouten:\n${errors.map((error) => `- ${error}`).join('\n')}`,
    `Vorige output:\n${JSON.stringify(invalidOutput).slice(0, 4000)}`,
  ].join('\n\n')
}
