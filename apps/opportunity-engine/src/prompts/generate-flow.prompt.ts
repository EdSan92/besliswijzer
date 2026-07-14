import type { OpportunityScore } from '../models/schemas.js'

export function buildGenerateFlowPrompt(opportunity: OpportunityScore): string {
  return `Je bent een expert in het ontwerpen van interactieve keuzehulpen voor affiliate marketing.

Maak een complete keuzehulp-flow voor een WEBSHOP-product (direct online te koop bij Bol/Coolblue/Amazon).

Zoekwoord: ${opportunity.keyword}
Categorie: ${opportunity.category}
Score: ${opportunity.score}
Redenen: ${opportunity.reasons.join('; ')}
Geschatte commissie: €${opportunity.estimatedCommission}

De flow moet:
- 3-6 vragen bevatten
- logische vertakkingen hebben
- minstens 2 resultaten opleveren met duidelijke affiliate-aanbevelingen
- Nederlandse taal gebruiken

Antwoord ALLEEN als JSON object met deze structuur:
{
  "title": string,
  "slug": string (kebab-case),
  "description": string,
  "seoTitle": string,
  "seoDescription": string,
  "nodes": [{ "nodeKey": string, "type": "question_single"|"question_multi"|"info", "title": string, "isEntry"?: boolean, "options"?: [{ "value": string, "label": string }] }],
  "rules": [{ "fromNodeKey": string, "targetNodeKey"?: string, "targetResultKey"?: string, "condition"?: object }],
  "results": [{ "resultKey": string, "title": string, "body": string, "ctaLabel"?: string, "ctaUrl"?: string }]
}`
}
