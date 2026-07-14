/** Producten met lange overwegingstijd / installatie — geen webshop-affiliate focus. */
const EXCLUDED_KEYWORD_PATTERNS = [
  /warmtepomp/i,
  /zonnepanel/i,
  /zonnecollect/i,
  /isolatie/i,
  /cv[- ]?ketel/i,
  /laadpaal/i,
  /thuisbatterij/i,
  /energiecontract/i,
  /hypotheek/i,
  /verbouwing/i,
  /dakkapel/i,
  /kunststof.?kozijn/i,
  /hr[- ]?glas/i,
  /ventilatie/i,
  /airco\s+install/i,
  /zonnepanelen\s+install/i,
]

const EXCLUDED_CATEGORY_PATTERNS = [
  /duurzame?\s+energie/i,
  /hvac/i,
  /home\s+improvement/i,
  /installatie/i,
  /bouw/i,
  /verbouwing/i,
]

export const WEBSHOP_SEED_CATEGORIES = [
  { name: 'Airfryer', description: 'Keukenapparaten direct online te koop' },
  { name: 'Robotstofzuiger', description: 'Huishoudelijke robots via webshops' },
  { name: 'Koptelefoon', description: 'Audio accessoires (Coolblue, Bol, Amazon)' },
  { name: 'Koffiemachine', description: 'Koffiezetapparaten en espressomachines' },
  { name: 'Monitor', description: 'Beeldschermen voor thuiswerken en gaming' },
  { name: 'Gaming muis', description: 'Gaming peripherals' },
  { name: 'Blender', description: 'Keukenmachines en blenders' },
  { name: 'Matras', description: 'Bedden en matrassen online bestelbaar' },
  { name: 'Wasmachine', description: 'Witgoed via webshops' },
  { name: 'Powerbank', description: 'Mobiele accessoires' },
  { name: 'Bluetooth speaker', description: 'Draagbare audio' },
  { name: 'Waterflosser', description: 'Persoonlijke verzorging' },
] as const

export const DEPRECATED_SEED_CATEGORIES = [
  'Warmtepomp',
  'Zonnepanelen',
  'E-bike',
  'Vloerbedekking',
  'Robotgrasmaaier',
] as const

export function isExcludedHighConsiderationProduct(term: string, category?: string): boolean {
  const text = `${term} ${category ?? ''}`
  return (
    EXCLUDED_KEYWORD_PATTERNS.some((pattern) => pattern.test(text)) ||
    EXCLUDED_CATEGORY_PATTERNS.some((pattern) => pattern.test(category ?? ''))
  )
}

export function isWebshopFocusedKeyword(term: string): boolean {
  if (isExcludedHighConsiderationProduct(term)) return false

  const webshopSignals =
    /beste|kopen|review|vergelijk|goedkoop|aanbieding|202\d|top\s*\d|test|koopwijzer|welke/i
  const productSignals =
    /airfryer|stofzuiger|koptelefoon|koffie|monitor|muis|toetsenbord|blender|matras|wasmachine|droger|vaatwasser|laptop|tablet|speaker|powerbank|föhn|trimmer|scheerapparaat|waterflosser|nespresso|iphone|samsung|playstation|xbox|nintendo/i

  return webshopSignals.test(term) || productSignals.test(term)
}
