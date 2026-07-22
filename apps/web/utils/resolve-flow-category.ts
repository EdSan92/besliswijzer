import { toSlug } from './fetch-errors'

export type AdminCategory = {
  id: string
  slug: string
  title: string
  description?: string | null
}

const KEYWORD_CATEGORY_HINTS: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /robotstofzuiger|stofzuiger/i, title: 'Robotstofzuiger' },
  { pattern: /airfryer|frituur/i, title: 'Airfryer' },
  { pattern: /koptelefoon|headset|earbud|noise.?cancell/i, title: 'Koptelefoon' },
  { pattern: /koffie|espresso|nespresso/i, title: 'Koffiemachine' },
  { pattern: /monitor|beeldscherm/i, title: 'Monitor' },
  { pattern: /gaming.?muis|computermuis/i, title: 'Gaming muis' },
  { pattern: /blender|mixer/i, title: 'Blender' },
  { pattern: /matras|bedden/i, title: 'Matras' },
  { pattern: /wasmachine|droger|vaatwasser/i, title: 'Wasmachine' },
  { pattern: /powerbank/i, title: 'Powerbank' },
  { pattern: /bluetooth.?speaker|speaker/i, title: 'Bluetooth speaker' },
  { pattern: /waterflosser|tandenborstel|scheerapparaat|trimmer|föhn/i, title: 'Waterflosser' },
]

function stemSlug(slug: string): string {
  return slug.replace(/s$/, '')
}

function slugsAreRelated(a: string, b: string): boolean {
  if (a === b) return true
  const stemA = stemSlug(a)
  const stemB = stemSlug(b)
  return stemA === stemB || a.startsWith(stemB) || b.startsWith(stemA)
}

export function inferCategoryTitleFromKeyword(keyword: string): string | null {
  for (const hint of KEYWORD_CATEGORY_HINTS) {
    if (hint.pattern.test(keyword)) return hint.title
  }
  return null
}

export function findMatchingCategory(
  categoryName: string,
  categories: AdminCategory[],
  keyword?: string,
): AdminCategory | null {
  const candidates = [categoryName.trim()]
  const inferred = keyword ? inferCategoryTitleFromKeyword(keyword) : null
  if (inferred) candidates.unshift(inferred)

  for (const candidate of candidates) {
    if (!candidate) continue

    const slug = toSlug(candidate)

    for (const category of categories) {
      if (category.title.toLowerCase() === candidate.toLowerCase()) return category
      if (category.slug === slug) return category
      if (slugsAreRelated(category.slug, slug)) return category
      if (
        category.title.toLowerCase().includes(candidate.toLowerCase()) ||
        candidate.toLowerCase().includes(category.title.toLowerCase())
      ) {
        return category
      }
    }
  }

  return null
}

export function categorySlugForCreate(title: string, categories: AdminCategory[]): string {
  const base = toSlug(title) || 'overig'
  let slug = base
  let suffix = 2

  while (categories.some((category) => category.slug === slug)) {
    slug = `${base}-${suffix}`
    suffix++
  }

  return slug
}

export function resolveCategoryTitleForCreate(
  categoryName: string,
  categories: AdminCategory[],
  keyword?: string,
): string {
  const match = findMatchingCategory(categoryName, categories, keyword)
  if (match) return match.title

  const inferred = keyword ? inferCategoryTitleFromKeyword(keyword) : null
  if (inferred) return inferred

  return categoryName.trim() || 'Overig'
}
