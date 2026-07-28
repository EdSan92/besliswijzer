export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational'
  | 'unknown'

export type KeywordResearchVariantInput = {
  term: string
  searchVolume?: number
  cpcLow?: number
  cpcHigh?: number
  competition?: number
}

export type KeywordResearchRequest = {
  primaryKeyword: string
  language: string
  seedVariants?: string[]
}

export type KeywordResearchProviderResult = {
  primaryKeyword: string
  variants: KeywordResearchVariantInput[]
  questions: string[]
  searchIntent?: SearchIntent
  limitations?: string[]
}

export interface KeywordResearchProvider {
  readonly name: string
  research(request: KeywordResearchRequest): Promise<KeywordResearchProviderResult>
}
