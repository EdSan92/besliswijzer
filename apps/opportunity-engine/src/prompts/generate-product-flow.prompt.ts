export type ProductFlowPromptInput = {
  productTitle: string
  canonicalName: string
  category: string
  flowSlug: string
  keywords: string[]
}

export function buildGenerateProductFlowPrompt(input: ProductFlowPromptInput): string {
  return `Je bent een expert in het ontwerpen van interactieve keuzehulpen voor affiliate marketing.

Maak ÉÉN samengevoegde keuzehulp-flow voor een PRODUCT (niet per zoekwoord).

Product: ${input.productTitle}
Canonical name: ${input.canonicalName}
Categorie: ${input.category}
Flow slug (verplicht gebruiken): ${input.flowSlug}

Zoekwoorden / intents (allemaal in deze ene flow verwerken):
${input.keywords.map((kw) => `- ${kw}`).join('\n')}

De flow moet:
- ÉÉN geïntegreerde keuzehulp zijn — GEEN aparte flows per zoekwoord
- 4-7 vragen met logische vertakkingen die alle genoemde zoekintents afdekken
- Minstens 2 resultaten met duidelijke affiliate-aanbevelingen
- Slug exact "${input.flowSlug}" (product-niveau, geen keyword in slug)
- Nederlandse taal
- Direct online koopbaar bij Bol/Coolblue/Amazon

Antwoord ALLEEN als JSON object met deze structuur:
{
  "title": string,
  "slug": string,
  "description": string,
  "seoTitle": string,
  "seoDescription": string,
  "nodes": [{ "nodeKey": string, "type": "question_single"|"question_multi"|"info", "title": string, "isEntry"?: boolean, "options"?: [{ "value": string, "label": string }] }],
  "rules": [{ "fromNodeKey": string, "targetNodeKey"?: string, "targetResultKey"?: string, "condition"?: object }],
  "results": [{ "resultKey": string, "title": string, "body": string, "ctaLabel"?: string, "ctaUrl"?: string }]
}`
}
