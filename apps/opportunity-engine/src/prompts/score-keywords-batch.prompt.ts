import type { KeywordData } from '../models/schemas.js'

export function buildScoreKeywordsBatchPrompt(
  keywords: KeywordData[],
  platform: string,
): string {
  const keywordList = keywords
    .map(
      (kw, i) =>
        `${i + 1}. "${kw.term}" — volume: ${kw.searchVolume ?? '?'}, concurrentie: ${kw.competition ?? '?'}, CPC: ${kw.cpcLow ?? '?'}-${kw.cpcHigh ?? '?'}`,
    )
    .join('\n')

  return `Je bent een affiliate marketing strateeg voor "${platform}" — WEBSHOP-producten (direct online koopbaar).

Beoordeel ALLE onderstaande zoekwoorden in één keer.

REGELS:
- Alleen webshop-producten (Bol/Coolblue/Amazon), prijsrange €25-€800
- Score 0-30 voor installatieproducten (warmtepomp, zonnepanelen, etc.)
- Alleen scores ≥60 opnemen in de output

Zoekwoorden:
${keywordList}

Antwoord ALLEEN als JSON:
{
  "opportunities": [
    {
      "keyword": string,
      "category": string,
      "score": number,
      "reasons": string[],
      "estimatedCommission": number,
      "confidence": number
    }
  ]
}

Neem alleen keywords op die score ≥60 hebben en webshop-producten zijn.`
}
