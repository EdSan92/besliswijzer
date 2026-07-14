import { createHash } from 'node:crypto'

export function hashPrompt(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
