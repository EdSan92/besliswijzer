import type { OpportunityScore } from '../models/schemas.js'

export function buildGenerateFaqPrompt(opportunity: OpportunityScore): string {
  return `Je bent een SEO-expert voor productkeuzehulpen (Nederlandse markt).

Schrijf één FAQ-item voor een bestaande productpagina — GEEN aparte keuzehulp-flow.

Zoekwoord: ${opportunity.keyword}
Categorie: ${opportunity.category}
Score: ${opportunity.score}
Redenen: ${opportunity.reasons.join('; ')}

Regels:
- De vraag moet natuurlijk klinken (zoals een gebruiker zou zoeken)
- Het antwoord is 2-4 zinnen, informatief en onafhankelijk
- Verwijs niet naar "deze keuzehulp" — de FAQ staat op de productpagina zelf
- Nederlands

Antwoord ALLEEN als JSON:
{
  "question": string,
  "answer": string
}`
}
