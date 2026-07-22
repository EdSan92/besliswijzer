import { and, eq } from 'drizzle-orm'
import { productKeywords, productPages, products, type Database } from '@besliswijzer/db'
import {
  contentBlockSchema,
  flowBelongsToProduct,
  pageLayoutSchema,
  pageSeoSchema,
  sortContentBlocks,
  validateProductPageBlocks,
  type ContentBlock,
  type PublicProductPageResponse,
} from '@besliswijzer/product-schema'

function parseBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return []

  const blocks: ContentBlock[] = []
  for (const item of raw) {
    const parsed = contentBlockSchema.safeParse(item)
    if (parsed.success) {
      blocks.push(parsed.data)
    }
  }
  return blocks
}

type ProductPageRecord = {
  id: string
  slug: string
  title: string
  status: string
  seoMeta: unknown
  layout: unknown
  blocks: unknown
  updatedAt: Date
  product: {
    slug: string
    title: string
    canonicalName: string
    category: { slug: string; title: string } | null
  } | null
}

function buildProductPageResponse(page: ProductPageRecord): PublicProductPageResponse | null {
  if (!page.product) return null

  const seo = pageSeoSchema.safeParse(page.seoMeta)
  const layout = pageLayoutSchema.safeParse(page.layout)
  const blocks = parseBlocks(page.blocks)

  if (!seo.success || blocks.length === 0) return null

  const blockOrder = layout.success ? layout.data.blockOrder : []
  const sortedBlocks = sortContentBlocks(blocks, blockOrder)

  return {
    slug: page.slug,
    title: page.title,
    seo: seo.data,
    layout: layout.success ? layout.data : { blockOrder: [] },
    product: {
      slug: page.product.slug,
      title: page.product.title,
      canonicalName: page.product.canonicalName,
      categorySlug: page.product.category?.slug ?? null,
    },
    blocks: sortedBlocks,
  }
}

export function validateProductPageForPublish(page: {
  blocks: unknown
  seoMeta: unknown
}): string[] {
  const errors = validateProductPageBlocks(parseBlocks(page.blocks))
  const seo = pageSeoSchema.safeParse(page.seoMeta)
  if (!seo.success) {
    errors.push('SEO-metadata is ongeldig of ontbreekt')
  }
  if (parseBlocks(page.blocks).length === 0) {
    errors.push('Pagina heeft geen contentblokken')
  }
  return errors
}

function extractFlowSlugsFromBlocks(raw: unknown): string[] {
  const slugs: string[] = []
  for (const block of parseBlocks(raw)) {
    if (block.type === 'flow') {
      slugs.push(block.data.flowSlug)
    }
  }
  return slugs
}

export async function buildFlowToProductPageSlugMap(
  db: Database,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}

  const catalog = await db.query.products.findMany({
    with: {
      primaryFlow: true,
      pages: true,
    },
  })

  for (const product of catalog) {
    const pageSlug = product.pages.find((page) => page.status === 'published')?.slug
    const flowSlug = product.primaryFlow?.slug
    if (pageSlug && flowSlug && !map[flowSlug]) {
      map[flowSlug] = pageSlug
    }
  }

  const publishedPages = await db.query.productPages.findMany({
    where: eq(productPages.status, 'published'),
    columns: { slug: true, blocks: true },
  })

  for (const page of publishedPages) {
    for (const flowSlug of extractFlowSlugsFromBlocks(page.blocks)) {
      if (!map[flowSlug]) {
        map[flowSlug] = page.slug
      }
    }
  }

  const allFlows = await db.query.flows.findMany({
    columns: { id: true, slug: true, title: true },
  })

  for (const product of catalog) {
    const pageSlug = product.pages.find((page) => page.status === 'published')?.slug
    if (!pageSlug) continue

    for (const flow of allFlows) {
      if (
        flowBelongsToProduct(flow, {
          productSlug: product.slug,
          canonicalName: product.canonicalName,
          primaryFlowSlug: product.primaryFlow?.slug ?? null,
        }) &&
        !map[flow.slug]
      ) {
        map[flow.slug] = pageSlug
      }
    }
  }

  return map
}

export async function getPublishedProductPage(
  db: Database,
  slug: string,
): Promise<PublicProductPageResponse | null> {
  const page = await db.query.productPages.findFirst({
    where: and(eq(productPages.slug, slug), eq(productPages.status, 'published')),
    with: {
      product: {
        with: { category: true },
      },
    },
  })

  if (!page?.product) return null

  return buildProductPageResponse({
    id: page.id,
    slug: page.slug,
    title: page.title,
    status: page.status,
    seoMeta: page.seoMeta,
    layout: page.layout,
    blocks: page.blocks,
    updatedAt: page.updatedAt,
    product: page.product,
  })
}

export async function listPublishedProductPageSlugs(db: Database): Promise<string[]> {
  const pages = await db.query.productPages.findMany({
    where: eq(productPages.status, 'published'),
    columns: { slug: true },
  })
  return pages.map((page) => page.slug)
}

export async function getProductBySlug(db: Database, slug: string) {
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true, primaryFlow: true, pages: true },
  })
}

export type CreateProductPageInput = {
  product: {
    slug: string
    title: string
    canonicalName: string
    categoryId?: string | null
    primaryFlowId: string
  }
  page: {
    slug: string
    title: string
    seoMeta: {
      title: string
      description: string
      twitterCard?: 'summary' | 'summary_large_image'
    }
    layout: { blockOrder: string[] }
    blocks: ContentBlock[]
    status?: 'draft' | 'published'
  }
}

export async function createProductPage(
  db: Database,
  input: CreateProductPageInput,
): Promise<{ productId: string; pageId: string; pageSlug: string; status: string }> {
  const existingPage = await db.query.productPages.findFirst({
    where: eq(productPages.slug, input.page.slug),
  })
  if (existingPage) {
    throw new Error(`Product page "${input.page.slug}" already exists`)
  }

  let product = await db.query.products.findFirst({
    where: eq(products.slug, input.product.slug),
  })

  if (product) {
    await db
      .update(products)
      .set({
        title: input.product.title,
        canonicalName: input.product.canonicalName,
        categoryId: input.product.categoryId ?? null,
        primaryFlowId: input.product.primaryFlowId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id))
  } else {
    const [created] = await db
      .insert(products)
      .values({
        slug: input.product.slug,
        title: input.product.title,
        canonicalName: input.product.canonicalName,
        categoryId: input.product.categoryId ?? null,
        primaryFlowId: input.product.primaryFlowId,
        status: input.page.status ?? 'draft',
      })
      .returning()
    product = created!
  }

  const [page] = await db
    .insert(productPages)
    .values({
      productId: product.id,
      slug: input.page.slug,
      title: input.page.title,
      seoMeta: input.page.seoMeta,
      layout: input.page.layout,
      blocks: input.page.blocks,
      status: input.page.status ?? 'draft',
    })
    .returning()

  return {
    productId: product.id,
    pageId: page!.id,
    pageSlug: page!.slug,
    status: page!.status,
  }
}

export type AdminProductPageListItem = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  blockCount: number
  updatedAt: string
  seoTitle: string | null
  product: {
    id: string
    slug: string
    title: string
    primaryFlowSlug: string | null
    categoryTitle: string | null
  }
}

export type AdminProductPageDetail = PublicProductPageResponse & {
  id: string
  status: 'draft' | 'published'
  updatedAt: string
}

export type AdminProductListItem = {
  id: string
  slug: string
  title: string
  canonicalName: string
  categoryTitle: string | null
  primaryFlowId: string | null
  primaryFlowSlug: string | null
  pageSlug: string | null
  keywordCount: number
}

export async function listAdminProducts(db: Database): Promise<AdminProductListItem[]> {
  const rows = await db.query.products.findMany({
    orderBy: (product, { asc }) => [asc(product.title)],
    with: {
      category: true,
      primaryFlow: {
        with: { category: true },
      },
      keywords: true,
      pages: true,
    },
  })

  return rows.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    canonicalName: product.canonicalName,
    categoryTitle: product.category?.title ?? product.primaryFlow?.category?.title ?? null,
    primaryFlowId: product.primaryFlowId,
    primaryFlowSlug: product.primaryFlow?.slug ?? null,
    pageSlug: product.pages[0]?.slug ?? null,
    keywordCount: product.keywords.length,
  }))
}

export async function listAdminProductPages(db: Database): Promise<AdminProductPageListItem[]> {
  const pages = await db.query.productPages.findMany({
    orderBy: (page, { desc }) => [desc(page.updatedAt)],
    with: {
      product: {
        with: {
          category: true,
          primaryFlow: true,
        },
      },
    },
  })

  return pages
    .filter((page) => page.product)
    .map((page) => {
      const seo = pageSeoSchema.safeParse(page.seoMeta)
      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status as 'draft' | 'published',
        blockCount: parseBlocks(page.blocks).length,
        updatedAt: page.updatedAt.toISOString(),
        seoTitle: seo.success ? seo.data.title : null,
        product: {
          id: page.product!.id,
          slug: page.product!.slug,
          title: page.product!.title,
          primaryFlowSlug: page.product!.primaryFlow?.slug ?? null,
          categoryTitle: page.product!.category?.title ?? null,
        },
      }
    })
}

export async function getAdminProductPage(
  db: Database,
  slug: string,
): Promise<AdminProductPageDetail | null> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, slug),
    with: {
      product: {
        with: { category: true },
      },
    },
  })

  if (!page?.product) return null

  const response = buildProductPageResponse({
    id: page.id,
    slug: page.slug,
    title: page.title,
    status: page.status,
    seoMeta: page.seoMeta,
    layout: page.layout,
    blocks: page.blocks,
    updatedAt: page.updatedAt,
    product: page.product,
  })

  if (!response) return null

  return {
    ...response,
    id: page.id,
    status: page.status as 'draft' | 'published',
    updatedAt: page.updatedAt.toISOString(),
  }
}

export async function publishProductPage(
  db: Database,
  slug: string,
): Promise<{ slug: string; status: 'published' }> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, slug),
    with: { product: true },
  })

  if (!page) {
    throw new Error(`Productpagina "${slug}" niet gevonden`)
  }

  if (page.status === 'published') {
    return { slug: page.slug, status: 'published' }
  }

  const errors = validateProductPageForPublish(page)
  if (errors.length > 0) {
    throw new Error(`Kan niet publiceren: ${errors.join('; ')}`)
  }

  const now = new Date()

  await db
    .update(productPages)
    .set({ status: 'published', updatedAt: now })
    .where(eq(productPages.id, page.id))

  if (page.product) {
    await db
      .update(products)
      .set({ status: 'published', updatedAt: now })
      .where(eq(products.id, page.product.id))
  }

  return { slug: page.slug, status: 'published' }
}

export async function unpublishProductPage(
  db: Database,
  slug: string,
): Promise<{ slug: string; status: 'draft' }> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, slug),
    with: { product: true },
  })

  if (!page) {
    throw new Error(`Productpagina "${slug}" niet gevonden`)
  }

  if (page.status === 'draft') {
    return { slug: page.slug, status: 'draft' }
  }

  const now = new Date()

  await db
    .update(productPages)
    .set({ status: 'draft', updatedAt: now })
    .where(eq(productPages.id, page.id))

  if (page.product) {
    await db
      .update(products)
      .set({ status: 'draft', updatedAt: now })
      .where(eq(products.id, page.product.id))
  }

  return { slug: page.slug, status: 'draft' }
}

export type ProductPageRegenerateInput = {
  productSlug: string
  productTitle: string
  canonicalName: string
  categoryTitle: string
  categoryId?: string
  flowId: string
  flowSlug: string
  flowTitle: string
  pageSlug: string
  seedKeywords: string[]
  contentKeywords: Array<{
    term: string
    opportunityId?: string
    score?: number
    categoryName?: string
  }>
}

function extractFlowFromPageBlocks(blocks: unknown): { flowId: string; flowSlug: string } | null {
  const flowBlock = parseBlocks(blocks).find((block) => block.type === 'flow')
  if (flowBlock?.type !== 'flow') return null
  return { flowId: flowBlock.data.flowId, flowSlug: flowBlock.data.flowSlug }
}

export async function getProductPageRegenerateInput(
  db: Database,
  slug: string,
): Promise<ProductPageRegenerateInput> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, slug),
    with: {
      product: {
        with: {
          category: true,
          primaryFlow: true,
          keywords: true,
        },
      },
    },
  })

  if (!page?.product) {
    throw new Error(`Productpagina "${slug}" niet gevonden`)
  }

  const flowFromProduct = page.product.primaryFlow
  const flowFromBlock = extractFlowFromPageBlocks(page.blocks)
  const flowId = flowFromProduct?.id ?? flowFromBlock?.flowId
  const flowSlug = flowFromProduct?.slug ?? flowFromBlock?.flowSlug

  if (!flowId || !flowSlug) {
    throw new Error('Geen gekoppelde flow gevonden — koppel eerst een flow aan dit product.')
  }

  const seedKeywords = page.product.keywords.map((keyword) => keyword.term)
  const contentKeywords =
    seedKeywords.length > 0
      ? page.product.keywords.map((keyword) => ({
          term: keyword.term,
          opportunityId: keyword.opportunityId ?? undefined,
        }))
      : [{ term: page.product.canonicalName }]

  return {
    productSlug: page.product.slug,
    productTitle: page.product.title,
    canonicalName: page.product.canonicalName,
    categoryTitle: page.product.category?.title ?? 'Keuzehulp',
    categoryId: page.product.categoryId ?? undefined,
    flowId,
    flowSlug,
    flowTitle: flowFromProduct?.title ?? page.title,
    pageSlug: page.slug,
    seedKeywords: contentKeywords.map((keyword) => keyword.term),
    contentKeywords,
  }
}

async function fetchOpportunityKeywords(
  productSlug: string,
  opportunityApiBase: string,
): Promise<
  Array<{ term: string; opportunityId: string; score: number; categoryName: string }>
> {
  const baseUrl = opportunityApiBase.replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/products/${productSlug}/keywords`)
  if (!response.ok) return []

  const data = (await response.json()) as {
    keywords: Array<{ term: string; opportunityId: string; score: number; categoryName: string }>
  }
  return data.keywords ?? []
}

function mergeContentKeywords(
  existing: ProductPageRegenerateInput['contentKeywords'],
  fromOpportunities: ProductPageRegenerateInput['contentKeywords'],
): ProductPageRegenerateInput['contentKeywords'] {
  const merged = new Map<string, ProductPageRegenerateInput['contentKeywords'][number]>()

  for (const keyword of [...existing, ...fromOpportunities]) {
    const key = keyword.term.toLowerCase()
    const current = merged.get(key)
    if (!current || (keyword.score ?? 0) > (current.score ?? 0)) {
      merged.set(key, keyword)
    }
  }

  return [...merged.values()].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.term.localeCompare(b.term, 'nl'),
  )
}

export async function buildGeneratePageInputForProduct(
  db: Database,
  productSlug: string,
  opportunityApiBase?: string,
): Promise<Omit<ProductPageRegenerateInput, 'pageSlug'>> {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, productSlug),
    with: {
      category: true,
      primaryFlow: {
        with: { category: true },
      },
      keywords: true,
      pages: true,
    },
  })

  if (!product) {
    throw new Error(`Product "${productSlug}" niet gevonden`)
  }

  if (product.pages.length > 0) {
    throw new Error(`Product "${productSlug}" heeft al een productpagina (${product.pages[0]!.slug})`)
  }

  if (!product.primaryFlow) {
    throw new Error(`Product "${productSlug}" heeft geen gekoppelde flow — voer eerst de product-migratie uit.`)
  }

  let contentKeywords =
    product.keywords.length > 0
      ? product.keywords.map((keyword) => ({
          term: keyword.term,
          opportunityId: keyword.opportunityId ?? undefined,
        }))
      : [{ term: product.canonicalName }]

  if (opportunityApiBase) {
    const opportunityKeywords = await fetchOpportunityKeywords(productSlug, opportunityApiBase)
    if (opportunityKeywords.length > 0) {
      contentKeywords = mergeContentKeywords(
        contentKeywords,
        opportunityKeywords.map((keyword) => ({
          term: keyword.term,
          opportunityId: keyword.opportunityId,
          score: keyword.score,
          categoryName: keyword.categoryName,
        })),
      )
    }
  }

  return {
    productSlug: product.slug,
    productTitle: product.title,
    canonicalName: product.canonicalName,
    categoryTitle:
      product.category?.title ?? product.primaryFlow.category?.title ?? 'Keuzehulp',
    categoryId: product.categoryId ?? product.primaryFlow.categoryId ?? undefined,
    flowId: product.primaryFlow.id,
    flowSlug: product.primaryFlow.slug,
    flowTitle: product.primaryFlow.title,
    seedKeywords: contentKeywords.map((keyword) => keyword.term),
    contentKeywords,
  }
}

export async function generateProductPageForProductSlug(
  db: Database,
  productSlug: string,
  opportunityApiBase: string,
): Promise<{ productId: string; pageId: string; pageSlug: string; status: string }> {
  const input = await buildGeneratePageInputForProduct(db, productSlug, opportunityApiBase)
  const baseUrl = opportunityApiBase.replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/api/product-pages/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, publish: false }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Productpagina genereren mislukt (${response.status}): ${body}`)
  }

  return (await response.json()) as {
    productId: string
    pageId: string
    pageSlug: string
    status: string
  }
}

export type UpdateProductPageInput = {
  title?: string
  seoMeta?: {
    title: string
    description: string
    twitterCard?: 'summary' | 'summary_large_image'
  }
  layout?: { blockOrder: string[] }
  blocks?: ContentBlock[]
}

export async function updateProductPage(
  db: Database,
  slug: string,
  input: UpdateProductPageInput,
): Promise<{ productId: string; pageId: string; pageSlug: string; status: string }> {
  const page = await db.query.productPages.findFirst({
    where: eq(productPages.slug, slug),
  })

  if (!page) {
    throw new Error(`Productpagina "${slug}" niet gevonden`)
  }

  const now = new Date()

  await db
    .update(productPages)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.seoMeta !== undefined ? { seoMeta: input.seoMeta } : {}),
      ...(input.layout !== undefined ? { layout: input.layout } : {}),
      ...(input.blocks !== undefined ? { blocks: input.blocks } : {}),
      updatedAt: now,
    })
    .where(eq(productPages.id, page.id))

  return {
    productId: page.productId,
    pageId: page.id,
    pageSlug: page.slug,
    status: page.status,
  }
}

export async function syncProductKeywords(
  db: Database,
  productId: string,
  keywords: Array<{ term: string; opportunityId?: string | null }>,
): Promise<number> {
  for (const keyword of keywords) {
    await db
      .insert(productKeywords)
      .values({
        productId,
        term: keyword.term.trim(),
        source: keyword.opportunityId ? 'opportunity' : 'ai',
        opportunityId: keyword.opportunityId ?? null,
      })
      .onConflictDoNothing({ target: [productKeywords.productId, productKeywords.term] })
  }

  return keywords.length
}

export async function regenerateProductPageViaOpportunity(
  db: Database,
  slug: string,
  opportunityApiBase: string,
): Promise<{ productId: string; pageId: string; pageSlug: string; status: string }> {
  const input = await getProductPageRegenerateInput(db, slug)
  const opportunityKeywords = await fetchOpportunityKeywords(input.productSlug, opportunityApiBase)

  if (opportunityKeywords.length > 0) {
    input.contentKeywords = mergeContentKeywords(
      input.contentKeywords,
      opportunityKeywords.map((keyword) => ({
        term: keyword.term,
        opportunityId: keyword.opportunityId,
        score: keyword.score,
        categoryName: keyword.categoryName,
      })),
    )
    input.seedKeywords = input.contentKeywords.map((keyword) => keyword.term)
  }

  const baseUrl = opportunityApiBase.replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/api/product-pages/regenerate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Content genereren mislukt (${response.status}): ${body}`)
  }

  return (await response.json()) as {
    productId: string
    pageId: string
    pageSlug: string
    status: string
  }
}
