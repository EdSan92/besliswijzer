const SLUG_PATTERN = /^[a-z0-9-]+$/
const KEY_PATTERN = /^[a-z0-9_]+$/

export function sanitizeSlug(input: string, maxLength = 80): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const trimmed = cleaned.slice(0, maxLength).replace(/-+$/g, '')
  return trimmed.length >= 2 ? trimmed : 'keuzehulp'
}

export function sanitizeKey(input: string, maxLength = 40): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  const trimmed = cleaned.slice(0, maxLength).replace(/_+$/g, '')
  return trimmed.length >= 1 ? trimmed : 'key'
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

export function isValidKey(value: string): boolean {
  return KEY_PATTERN.test(value)
}

export function stableSortOrder<T>(items: T[], getOrder: (item: T) => number): T[] {
  return [...items].sort((left, right) => getOrder(left) - getOrder(right))
}
