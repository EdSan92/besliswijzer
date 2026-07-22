import { eq } from 'drizzle-orm'
import { productKeywords, productPages, products, type Database } from '@besliswijzer/db'
import {
  contentBlockSchema,
  faqItemSchema,
  pickBestProductMatch,
  type ContentBlock,
  type FAQItem,
  type ProductMatchCandidate,
} from '@besliswijzer/product-schema'

export async function listProductsForMatching(db: Database) {
  const rows = await db.query.products.findMany({
    with: {
      category: true,
      keywords: true,
      pages: true,
    },
  })

  return rows.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    canonicalName: product.canonicalName,
    categorySlug: product.category?.slug ?? null,
    categoryTitle: product.category?.title ?? null,
    keywordTerms: product.keywords.map((kw) => kw.term),
    pageSlug: product.pages.find((page) => page.status === 'published')?.slug ?? null,
  }))
}

export async function matchProductForOpportunity(
  db: Database,
  keywordTerm: string,
  categoryName?: string,
): Promise<ProductMatchCandidate | null> {
  const catalog = await listProductsForMatching(db)
  return pickBestProductMatch(keywordTerm, categoryName, catalog)
}

function parseBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: ContentBlock[] = []
  for (const item of raw) {
    const parsed = contentBlockSchema.safeParse(item)
    if (parsed.success) blocks.push(parsed.data)
  }
  return blocks
}

export async function appendFaqToProductPage(
  db: Database,
  pageSlug: string,
  input: {
    opportunityId: string
    keywordTerm: string
    question: string
    answer: string
  },
): Promise<{ pageSlug: string; faqItemId: string; created: boolean }> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, pageSlug),
    with: {
      product: {
        with: { keywords: true },
      },
    },
  })

  if (!page?.product) {
    throw new Error(`Product page "${pageSlug}" not found`)
  }

  const faqItem: FAQItem = faqItemSchema.parse({
    id: `faq_opp_${input.opportunityId}`,
    question: input.question,
    answer: input.answer,
    source: 'opportunity',
    opportunityId: input.opportunityId,
  })

  const blocks = parseBlocks(page.blocks)
  const existingFaq = blocks.find((block) => block.type === 'faq')

  if (existingFaq?.type === 'faq') {
    const duplicate = existingFaq.data.items.some(
      (item) => item.opportunityId === input.opportunityId || item.question === faqItem.question,
    )
    if (duplicate) {
      return { pageSlug, faqItemId: faqItem.id, created: false }
    }
    existingFaq.data.items.push(faqItem)
  } else {
    blocks.push({
      id: 'blk_faq',
      type: 'faq',
      sortOrder: blocks.length,
      visible: true,
      source: 'mixed',
      data: {
        title: `Veelgestelde vragen over ${page.product.title.toLowerCase()}`,
        items: [faqItem],
      },
    })
  }

  const layout = (page.layout ?? { blockOrder: [] }) as { blockOrder?: string[] }
  const blockOrder = layout.blockOrder ?? []
  if (!blockOrder.includes('blk_faq')) {
    blockOrder.push('blk_faq')
  }

  await db
    .update(productPages)
    .set({
      blocks,
      layout: { ...layout, blockOrder },
      updatedAt: new Date(),
    })
    .where(eq(productPages.id, page.id))

  const keywordExists = page.product.keywords.some(
    (kw) => kw.term.toLowerCase() === input.keywordTerm.toLowerCase(),
  )

  if (!keywordExists) {
    await db
      .insert(productKeywords)
      .values({
        productId: page.productId,
        term: input.keywordTerm,
        source: 'opportunity',
        opportunityId: input.opportunityId,
      })
      .onConflictDoNothing({ target: [productKeywords.productId, productKeywords.term] })
  }

  return { pageSlug, faqItemId: faqItem.id, created: true }
}

export function buildFallbackFaqItem(keywordTerm: string, opportunityId: string): FAQItem {
  const question = keywordTerm.trim().endsWith('?')
    ? keywordTerm.trim()
    : `${keywordTerm.charAt(0).toUpperCase()}${keywordTerm.slice(1)}?`

  return faqItemSchema.parse({
    id: `faq_opp_${opportunityId}`,
    question,
    answer: `Dit is een veelgezochte vraag over ${keywordTerm}. Bekijk de keuzehulp op deze pagina voor persoonlijk advies.`,
    source: 'opportunity',
    opportunityId,
  })
}
