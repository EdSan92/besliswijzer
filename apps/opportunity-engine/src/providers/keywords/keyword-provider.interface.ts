import type { KeywordData } from '../../models/schemas.js'

export type KeywordSearchResult = KeywordData & {
  source: string
}

export interface KeywordProvider {
  readonly name: string
  searchKeyword(keyword: string): Promise<KeywordSearchResult>
  searchMultiple(keywords: string[]): Promise<KeywordSearchResult[]>
  getQuestions(keyword: string): Promise<string[]>
}
