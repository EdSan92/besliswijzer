export function buildScoreKeywordPrompt(input: {
  keyword: string
  searchVolume?: number
  competition?: number
  cpcLow?: number
  cpcHigh?: number
  relatedQuestions?: string[]
  platform: string
}): string {
  return `Je bent een affiliate marketing strateeg voor "${input.platform}" — een platform dat keuzehulpen bouwt voor WEBSHOP-producten.

BELANGRIJK: We richten ons op producten die mensen direct online kopen (Bol.com, Coolblue, Amazon).
GEEN installatieproducten, GEEN lange sales cycles.

❌ Afwijzen (score max 30): warmtepompen, zonnepanelen, isolatie, CV-ketels, laadpalen, verbouwingen, hypotheken, energiecontracten
✅ Gewenst: consumentenelektronica, keukenapparaten, audio, gaming, witgoed, persoonlijke verzorging, accessoires
✅ Ideale prijsrange: €25 – €800 (direct in winkelwagen)

Zoekwoord: "${input.keyword}"
Zoekvolume (maandelijks): ${input.searchVolume ?? 'onbekend'}
Concurrentie (0-1): ${input.competition ?? 'onbekend'}
CPC laag: ${input.cpcLow ?? 'onbekend'}
CPC hoog: ${input.cpcHigh ?? 'onbekend'}
Gerelateerde vragen: ${input.relatedQuestions?.join(', ') || 'geen'}

Beoordeel op:
- directe koopintentie (online, korte beslissing)
- affiliate potentie via webshops
- productprijs in webshop-range (€25-€800 ideaal)
- concurrentie
- evergreen waarde
- geschiktheid voor productvergelijking / keuzehulp

Geef score 0-100. Alleen scores ≥60 als het een echt webshop-product is.

Antwoord ALLEEN als JSON object:
{
  "keyword": string,
  "category": string,
  "score": number (0-100),
  "reasons": string[],
  "estimatedCommission": number,
  "confidence": number (0-1)
}`
}
