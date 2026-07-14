export function buildDiscoverSeedPrompt(categoryName: string, platform: string): string {
  return `Je bent een keyword researcher voor "${platform}", een affiliate platform voor WEBSHOP-producten.

Genereer 10 zoekwoorden voor de categorie "${categoryName}".

REGELS:
- Alleen producten die je direct online koopt (Bol, Coolblue, Amazon)
- Focus op vergelijking/koopintentie: "beste X", "X kopen", "X vergelijken", "welke X"
- Prijsrange €25-€800
- GEEN warmtepompen, zonnepanelen, isolatie, installatie of verbouwing

Antwoord ALLEEN als JSON:
{
  "keywords": string[]
}`
}
