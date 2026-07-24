import type {
  DiscoveryResult,
  FlowStep,
  GenerateProductPageResult,
  OpportunityItem,
  OpportunityStatistics,
} from '~/types/opportunity'
import type { ProductMatchCandidate } from '@besliswijzer/product-schema'
import { convertOpportunityFlowToBesliswijzer, resolveImportedFlowSlug } from '~/utils/convert-opportunity-flow'
import { isOpportunityFlowDefinition } from '~/utils/opportunity-flow'
import {
  categorySlugForCreate,
  findMatchingCategory,
  resolveCategoryTitleForCreate,
  type AdminCategory,
} from '~/utils/resolve-flow-category'
import type { OpportunityFlowDefinition } from '~/types/opportunity-flow'
import {
  groupOpportunitiesByProduct,
  resolveProductFlowSlug,
  toProductSlug,
  type ProductOpportunityGroup,
} from '~/utils/group-opportunities-by-product'

const DISCOVERY_PIPELINE: Array<{ id: string; label: string }> = [
  { id: 'load-seeds', label: 'Seed categorieën laden' },
  { id: 'collect-keywords', label: 'Keywords verzamelen per categorie' },
  { id: 'score-keywords', label: 'Keywords scoren (batch + cache)' },
  { id: 'store-opportunities', label: 'Opportunities opslaan' },
  { id: 'route-faq', label: 'FAQ naar productpagina\'s routeren' },
  { id: 'save-run', label: 'Discovery-run opslaan' },
]

function createPendingSteps(): FlowStep[] {
  const now = new Date().toISOString()
  return DISCOVERY_PIPELINE.map((step) => ({
    ...step,
    status: 'pending' as const,
    timestamp: now,
  }))
}

export function useOpportunityEngine() {
  const loading = ref(false)
  const generatingFlowId = ref<string | null>(null)
  const error = ref('')
  const lastDiscovery = ref<DiscoveryResult | null>(null)
  const discoverySteps = ref<FlowStep[]>(createPendingSteps())
  const opportunities = ref<OpportunityItem[]>([])
  const generatedFlows = ref<OpportunityItem[]>([])
  const statistics = ref<OpportunityStatistics | null>(null)
  const successMessage = ref('')
  const tableFilter = ref<'all' | 'with_flow' | 'new'>('with_flow')
  const importingFlowId = ref<string | null>(null)
  const publishingFlowId = ref<string | null>(null)
  const routingOpportunityId = ref<string | null>(null)
  const generatingProductPageId = ref<string | null>(null)
  const generatingProductFlowKey = ref<string | null>(null)
  const importingProductFlowKey = ref<string | null>(null)
  const generatingProductPageKey = ref<string | null>(null)
  const importedFlowLinks = ref<Record<string, { flowId: string; slug: string }>>({})
  const importedProductFlowLinks = ref<Record<string, { flowId: string; slug: string }>>({})
  const productFlowDrafts = ref<Record<string, OpportunityFlowDefinition>>({})
  const routedPageLinks = ref<Record<string, { pageSlug: string }>>({})
  const generatedPageLinks = ref<Record<string, { pageSlug: string; status: string }>>({})
  const generatedProductPages = ref<Record<string, { pageSlug: string; status: string }>>({})
  const productMatches = ref<Record<string, ProductMatchCandidate>>({})

  let progressTimer: ReturnType<typeof setInterval> | null = null

  function stopProgressAnimation() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  function startProgressAnimation() {
    stopProgressAnimation()
    let activeIndex = 0
    const steps = createPendingSteps()
    steps[0].status = 'active'
    discoverySteps.value = steps

    progressTimer = setInterval(() => {
      if (activeIndex >= DISCOVERY_PIPELINE.length - 1) return

      const next = [...discoverySteps.value]
      next[activeIndex].status = 'done'
      activeIndex++
      next[activeIndex].status = 'active'
      discoverySteps.value = next
    }, 8000)
  }

  async function startDiscovery() {
    loading.value = true
    error.value = ''
    successMessage.value = ''
    lastDiscovery.value = null
    startProgressAnimation()

    try {
      const result = await $fetch<DiscoveryResult>('/api/opportunity/opportunities/discover', {
        method: 'POST',
        body: {},
      })
      lastDiscovery.value = result
      discoverySteps.value = result.steps
      if (result.faqsRouted > 0) {
        successMessage.value = `${result.faqsRouted} FAQ('s) toegevoegd aan productpagina's.`
      } else if (result.flowsGenerated > 0) {
        successMessage.value = `${result.flowsGenerated} flow(s) gegenereerd — zie sectie hieronder.`
      }
      await refreshOpportunityData()
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Discovery mislukt. Draait de Opportunity Engine?')
      discoverySteps.value = discoverySteps.value.map((step) =>
        step.status === 'active'
          ? { ...step, status: 'error', detail: 'Discovery afgebroken' }
          : step,
      )
    } finally {
      stopProgressAnimation()
      loading.value = false
    }
  }

  async function generateFlows(limit = 5) {
    loading.value = true
    error.value = ''
    successMessage.value = ''

    try {
      const result = await $fetch<{ generated: number; errors: string[] }>(
        '/api/opportunity/opportunities/generate-flows',
        {
          method: 'POST',
          body: { limit, status: 'NEW' },
        },
      )

      if (result.errors.length) {
        error.value = `${result.generated} flows gegenereerd. ${result.errors.length} fout(en).`
      } else if (result.generated > 0) {
        successMessage.value = `${result.generated} flow(s) gegenereerd — zie sectie hieronder.`
      }

      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Flow-generatie mislukt.')
      return null
    } finally {
      loading.value = false
    }
  }

  async function generateFlow(id: string) {
    generatingFlowId.value = id
    error.value = ''

    try {
      await $fetch(`/api/opportunity/opportunities/${id}/generate-flow`, { method: 'POST' })
      successMessage.value = 'Flow gegenereerd — zie sectie hieronder.'
      await refreshOpportunityData()
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Flow genereren mislukt.')
    } finally {
      generatingFlowId.value = null
    }
  }

  async function resolveBesliswijzerCategorySlug(
    categoryName: string,
    keyword: string,
  ): Promise<string> {
    const categories = await useAdminFetch<AdminCategory[]>('/api/v1/admin/categories')
    const match = findMatchingCategory(categoryName, categories, keyword)

    if (match) return match.slug

    const title = resolveCategoryTitleForCreate(categoryName, categories, keyword)
    const slug = categorySlugForCreate(title, categories)

    await useAdminFetch('/api/v1/admin/categories', {
      method: 'POST',
      body: {
        slug,
        title,
        description: `Keuzehulpen voor ${title.toLowerCase()}`,
        sortOrder: categories.length + 1,
      },
    })

    return slug
  }

  async function syncProductMatches() {
    const items = [...generatedFlows.value, ...opportunities.value]
    const matches: Record<string, ProductMatchCandidate> = { ...productMatches.value }

    for (const opportunity of items) {
      if (opportunity.status === 'ROUTED_TO_PRODUCT' && opportunity.routedPageSlug) {
        routedPageLinks.value[opportunity.id] = { pageSlug: opportunity.routedPageSlug }
        continue
      }

      try {
        const result = await useAdminFetch<{ match: ProductMatchCandidate | null }>(
          `/api/v1/admin/products/match?keyword=${encodeURIComponent(opportunity.keywordTerm)}&category=${encodeURIComponent(opportunity.categoryName)}`,
        )
        if (result.match) {
          matches[opportunity.id] = result.match
        } else {
          delete matches[opportunity.id]
        }
      } catch {
        delete matches[opportunity.id]
      }
    }

    productMatches.value = matches
  }

  async function syncImportedFlowLinks() {
    try {
      const flows = await useAdminFetch<Array<{ id: string; slug: string }>>('/api/v1/admin/flows')
      const links: Record<string, { flowId: string; slug: string }> = { ...importedFlowLinks.value }
      const seen = new Set<string>()

      for (const opportunity of [...generatedFlows.value, ...opportunities.value]) {
        if (seen.has(opportunity.id)) continue
        seen.add(opportunity.id)
        if (!isOpportunityFlowDefinition(opportunity.flowDefinition)) continue

        const slug = resolveImportedFlowSlug(opportunity.flowDefinition)
        const match = flows.find((flow) => flow.slug === slug)
        if (match) {
          links[opportunity.id] = { flowId: match.id, slug: match.slug }
        }
      }

      importedFlowLinks.value = links
    } catch {
      // Admin flows unavailable — edit links appear after a successful import.
    }
  }

  async function syncImportedProductFlowLinks() {
    try {
      const [flows, productsResponse] = await Promise.all([
        useAdminFetch<Array<{ id: string; slug: string }>>('/api/v1/admin/flows'),
        useAdminFetch<{
          products: Array<{
            slug: string
            primaryFlowId: string | null
            primaryFlowSlug: string | null
          }>
        }>('/api/v1/admin/products'),
      ])

      const links: Record<string, { flowId: string; slug: string }> = {
        ...importedProductFlowLinks.value,
      }

      for (const product of productsResponse.products) {
        if (product.primaryFlowId && product.primaryFlowSlug) {
          links[product.slug] = {
            flowId: product.primaryFlowId,
            slug: product.primaryFlowSlug,
          }
        }
      }

      const groups = groupOpportunitiesByProduct(
        [...generatedFlows.value, ...opportunities.value],
        productMatches.value,
      )

      for (const group of groups) {
        const expectedSlug = resolveProductFlowSlug(group.productSlug)
        const match = flows.find((flow) => flow.slug === expectedSlug)
        if (match) {
          links[group.key] = { flowId: match.id, slug: match.slug }
        }
      }

      importedProductFlowLinks.value = links
    } catch {
      // Admin data unavailable.
    }
  }

  function findProductGroup(productKey: string): ProductOpportunityGroup | undefined {
    return productGroups.value.find((group) => group.key === productKey)
  }

  function productHasPage(group: ProductOpportunityGroup): boolean {
    return Boolean(group.pageSlug || generatedProductPages.value[group.key])
  }

  function canGenerateProductPageForProduct(group: ProductOpportunityGroup): boolean {
    return !productHasPage(group) && Boolean(importedProductFlowLinks.value[group.key]?.flowId)
  }

  async function generateProductFlow(productKey: string) {
    const group = findProductGroup(productKey)
    if (!group) {
      error.value = 'Productgroep niet gevonden.'
      return null
    }

    generatingProductFlowKey.value = productKey
    error.value = ''
    successMessage.value = ''

    try {
      const response = await $fetch<{ flow: OpportunityFlowDefinition }>(
        '/api/opportunity/product-flows/generate',
        {
          method: 'POST',
          body: {
            productSlug: group.productSlug,
            productTitle: group.productTitle,
            canonicalName: group.canonicalName,
            categoryTitle: group.categoryTitle,
            flowSlug: resolveProductFlowSlug(group.productSlug),
            keywords: group.keywords,
          },
        },
      )

      productFlowDrafts.value[productKey] = response.flow
      successMessage.value = `Samengevoegde flow gegenereerd voor ${group.productTitle} (${group.keywords.length} zoekwoorden).`
      return response.flow
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Samengevoegde flow genereren mislukt.')
      return null
    } finally {
      generatingProductFlowKey.value = null
    }
  }

  async function importProductFlow(productKey: string, publish = false) {
    const group = findProductGroup(productKey)
    const flow = productFlowDrafts.value[productKey]
    if (!group) {
      error.value = 'Productgroep niet gevonden.'
      return null
    }
    if (!flow) {
      error.value = 'Genereer eerst een samengevoegde flow voor dit product.'
      return null
    }

    importingProductFlowKey.value = productKey
    error.value = ''
    successMessage.value = ''

    try {
      const categorySlug = await resolveBesliswijzerCategorySlug(
        group.categoryTitle,
        group.keywords[0] ?? group.productTitle,
      )
      const beslisFlow = convertOpportunityFlowToBesliswijzer(flow, categorySlug)
      const result = await useAdminFetch<{
        flowId: string
        slug: string
        published: boolean
        versionNumber: number | null
      }>('/api/v1/admin/flows/import', {
        method: 'POST',
        body: {
          publish,
          overwrite: true,
          flow: beslisFlow,
        },
      })

      importedProductFlowLinks.value[productKey] = { flowId: result.flowId, slug: result.slug }
      successMessage.value = publish
        ? `Samengevoegde flow "${result.slug}" geïmporteerd en gepubliceerd.`
        : `Samengevoegde flow "${result.slug}" geïmporteerd als draft.`

      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Flow importeren mislukt.')
      return null
    } finally {
      importingProductFlowKey.value = null
    }
  }

  function buildContentKeywordsForGroup(group: ProductOpportunityGroup) {
    const byId = new Map(
      [...generatedFlows.value, ...opportunities.value].map((item) => [item.id, item]),
    )

    return group.opportunityIds
      .map((opportunityId, index) => {
        const opportunity = byId.get(opportunityId)
        const term = group.keywords[index] ?? opportunity?.keywordTerm
        if (!term) return null

        return {
          term,
          opportunityId,
          score: opportunity?.score,
          categoryName: opportunity?.categoryName ?? group.categoryTitle,
        }
      })
      .filter((keyword): keyword is NonNullable<typeof keyword> => keyword !== null)
  }

  async function generateProductPageForProduct(productKey: string) {
    const group = findProductGroup(productKey)
    const importedLink = importedProductFlowLinks.value[productKey]
    if (!group) {
      error.value = 'Productgroep niet gevonden.'
      return null
    }
    if (!importedLink?.flowId) {
      error.value = 'Importeer eerst de samengevoegde flow.'
      return null
    }
    if (productHasPage(group)) {
      error.value = 'Er bestaat al een productpagina voor dit product.'
      return null
    }

    generatingProductPageKey.value = productKey
    error.value = ''
    successMessage.value = ''

    try {
      const result = await $fetch<GenerateProductPageResult>(
        '/api/opportunity/product-pages/generate',
        {
          method: 'POST',
          body: {
            productSlug: group.productSlug,
            productTitle: group.productTitle,
            canonicalName: group.canonicalName,
            categoryTitle: group.categoryTitle,
            flowId: importedLink.flowId,
            flowSlug: importedLink.slug,
            flowTitle: group.productTitle,
            seedKeywords: group.keywords,
            contentKeywords: buildContentKeywordsForGroup(group),
            publish: false,
          },
        },
      )

      generatedProductPages.value[productKey] = {
        pageSlug: result.pageSlug,
        status: result.status,
      }

      for (const opportunityId of group.opportunityIds) {
        generatedPageLinks.value[opportunityId] = {
          pageSlug: result.pageSlug,
          status: result.status,
        }
        const match = productMatches.value[opportunityId]
        if (match) {
          productMatches.value[opportunityId] = { ...match, pageSlug: result.pageSlug }
        }
      }

      successMessage.value = `Productpagina /${result.pageSlug} aangemaakt met één samengevoegde flow (${group.keywords.length} keywords).`
      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Productpagina genereren mislukt.')
      return null
    } finally {
      generatingProductPageKey.value = null
    }
  }

  function buildFallbackFaq(keywordTerm: string): { question: string; answer: string } {
    const question = keywordTerm.trim().endsWith('?')
      ? keywordTerm.trim()
      : `${keywordTerm.charAt(0).toUpperCase()}${keywordTerm.slice(1)}?`

    return {
      question,
      answer: `Dit is een veelgezochte vraag over ${keywordTerm}. Gebruik de keuzehulp op deze pagina voor persoonlijk advies op maat.`,
    }
  }

  function opportunityHasProductPage(item: OpportunityItem): boolean {
    return Boolean(
      item.routedPageSlug ||
        productMatches.value[item.id]?.pageSlug ||
        generatedPageLinks.value[item.id],
    )
  }

  function canGenerateProductPage(item: OpportunityItem): boolean {
    const match = productMatches.value[item.id]
    if (match?.productSlug) {
      const group = productGroups.value.find((entry) => entry.key === match.productSlug)
      if (group) return canGenerateProductPageForProduct(group)
    }
    return !opportunityHasProductPage(item) && Boolean(importedFlowLinks.value[item.id]?.flowId)
  }

  function buildGenerateProductPageBody(
    opportunity: OpportunityItem,
    importedLink: { flowId: string; slug: string },
    match?: ProductMatchCandidate,
  ) {
    const flowDef = isOpportunityFlowDefinition(opportunity.flowDefinition)
      ? opportunity.flowDefinition
      : null
    const flowTitle = flowDef?.title ?? opportunity.keywordTerm
    const productSlug = match?.productSlug ?? toProductSlug(flowDef?.slug ?? importedLink.slug)
    const productTitle = match?.productTitle ?? flowTitle
    const canonicalName = match?.canonicalName ?? productSlug

    return {
      productSlug,
      productTitle,
      canonicalName,
      categoryTitle: opportunity.categoryName,
      flowId: importedLink.flowId,
      flowSlug: importedLink.slug,
      flowTitle,
      seedKeywords: [opportunity.keywordTerm],
      contentKeywords: [
        {
          term: opportunity.keywordTerm,
          opportunityId: opportunity.id,
          score: opportunity.score,
          categoryName: opportunity.categoryName,
        },
      ],
      publish: false,
    }
  }

  async function generateProductPage(id: string) {
    const match = productMatches.value[id]
    if (match?.productSlug) {
      return generateProductPageForProduct(match.productSlug)
    }

    const opportunity = [...generatedFlows.value, ...opportunities.value].find((item) => item.id === id)
    if (!opportunity) {
      error.value = 'Opportunity niet gevonden.'
      return null
    }

    const importedLink = importedFlowLinks.value[id]
    if (!importedLink?.flowId) {
      error.value = 'Importeer eerst de flow naar Besliswijzer.'
      return null
    }

    if (opportunityHasProductPage(opportunity)) {
      error.value = 'Er bestaat al een productpagina voor deze opportunity.'
      return null
    }

    generatingProductPageId.value = id
    error.value = ''
    successMessage.value = ''

    try {
      const match = productMatches.value[id]
      const result = await $fetch<GenerateProductPageResult>(
        '/api/opportunity/product-pages/generate',
        {
          method: 'POST',
          body: buildGenerateProductPageBody(opportunity, importedLink, match),
        },
      )

      generatedPageLinks.value[id] = {
        pageSlug: result.pageSlug,
        status: result.status,
      }

      if (match) {
        productMatches.value[id] = { ...match, pageSlug: result.pageSlug }
      }

      successMessage.value =
        result.status === 'published'
          ? `Productpagina /${result.pageSlug} gegenereerd en gepubliceerd.`
          : `Productpagina /${result.pageSlug} gegenereerd als concept. Routeer nu FAQ-items of publiceer de pagina.`

      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(
        err,
        'Productpagina genereren mislukt. Is de flow geïmporteerd en bestaat de slug nog niet?',
      )
      return null
    } finally {
      generatingProductPageId.value = null
    }
  }

  async function routeToProductPage(id: string) {
    const opportunity = [...generatedFlows.value, ...opportunities.value].find((item) => item.id === id)
    if (!opportunity) {
      error.value = 'Opportunity niet gevonden.'
      return null
    }

    routingOpportunityId.value = id
    error.value = ''
    successMessage.value = ''

    try {
      let match: ProductMatchCandidate | undefined = productMatches.value[id]
      if (!match) {
        const result = await useAdminFetch<{ match: ProductMatchCandidate | null }>(
          `/api/v1/admin/products/match?keyword=${encodeURIComponent(opportunity.keywordTerm)}&category=${encodeURIComponent(opportunity.categoryName)}`,
        )
        match = result.match ?? undefined
        if (match) {
          productMatches.value[id] = match
        }
      }

      if (!match) {
        error.value = 'Geen passend product gevonden voor dit keyword.'
        return null
      }

      if (!match.pageSlug) {
        error.value = `Product "${match.productTitle}" heeft nog geen gepubliceerde pagina.`
        return null
      }

      let faqItem = opportunity.faqItem ?? null
      if (!faqItem?.question || !faqItem?.answer) {
        try {
          const faqResponse = await $fetch<{ opportunity: OpportunityItem }>(
            `/api/opportunity/opportunities/${id}/generate-faq`,
            { method: 'POST' },
          )
          faqItem = faqResponse.opportunity.faqItem ?? null
        } catch {
          faqItem = buildFallbackFaq(opportunity.keywordTerm)
        }
      }

      if (!faqItem) {
        faqItem = buildFallbackFaq(opportunity.keywordTerm)
      }

      const appendResult = await useAdminFetch<{ pageSlug: string; created: boolean }>(
        `/api/v1/admin/product-pages/${match.pageSlug}/faq-items`,
        {
          method: 'POST',
          body: {
            opportunityId: id,
            keywordTerm: opportunity.keywordTerm,
            question: faqItem.question,
            answer: faqItem.answer,
          },
        },
      )

      await $fetch(`/api/opportunity/opportunities/${id}/route`, {
        method: 'POST',
        body: {
          pageSlug: match.pageSlug,
          faqItem,
        },
      })

      routedPageLinks.value[id] = { pageSlug: match.pageSlug }
      successMessage.value = appendResult.created
        ? `FAQ toegevoegd aan /${match.pageSlug} (${match.productTitle}, ${Math.round(match.confidence * 100)}% match).`
        : `FAQ stond al op /${match.pageSlug} — opportunity gemarkeerd als verwerkt.`

      await refreshOpportunityData()
      return { pageSlug: match.pageSlug, faqItem }
    } catch (err) {
      error.value = toUserFacingFetchError(
        err,
        'Routeren naar productpagina mislukt. Bestaat er al een product voor dit keyword?',
      )
      return null
    } finally {
      routingOpportunityId.value = null
    }
  }

  async function importToBesliswijzer(id: string, publish = false) {
    const opportunity = [...generatedFlows.value, ...opportunities.value].find((item) => item.id === id)
    if (!opportunity || !isOpportunityFlowDefinition(opportunity.flowDefinition)) {
      error.value = 'Geen geldige flow-definitie om te importeren.'
      return null
    }

    importingFlowId.value = id
    error.value = ''
    successMessage.value = ''

    try {
      const categorySlug = await resolveBesliswijzerCategorySlug(
        opportunity.categoryName,
        opportunity.keywordTerm,
      )
      const flow = convertOpportunityFlowToBesliswijzer(opportunity.flowDefinition, categorySlug)
      const result = await useAdminFetch<{
        flowId: string
        slug: string
        published: boolean
        versionNumber: number | null
      }>('/api/v1/admin/flows/import', {
        method: 'POST',
        body: {
          publish,
          overwrite: true,
          flow,
        },
      })

      const isReimport = Boolean(importedFlowLinks.value[id])
      importedFlowLinks.value[id] = { flowId: result.flowId, slug: result.slug }
      if (publish) {
        await $fetch(`/api/opportunity/opportunities/${id}/publish`, { method: 'POST' })
      }
      const importVerb = isReimport ? 'opnieuw geïmporteerd' : 'geïmporteerd'
      successMessage.value = publish
        ? `Flow "${result.slug}" ${importVerb} in categorie "${categorySlug}" en gepubliceerd${result.versionNumber ? ` (v${result.versionNumber})` : ''}.`
        : `Flow "${result.slug}" ${importVerb} in categorie "${categorySlug}" als draft — publiceer vanuit admin of bewerk in Flows.`

      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Importeren naar Besliswijzer mislukt.')
      return null
    } finally {
      importingFlowId.value = null
    }
  }

  async function fetchGeneratedFlows() {
    const [generated, published, routed] = await Promise.all([
      $fetch<{ opportunities: OpportunityItem[] }>('/api/opportunity/opportunities', {
        query: { status: 'FLOW_GENERATED', limit: 50 },
      }),
      $fetch<{ opportunities: OpportunityItem[] }>('/api/opportunity/opportunities', {
        query: { status: 'PUBLISHED', limit: 50 },
      }),
      $fetch<{ opportunities: OpportunityItem[] }>('/api/opportunity/opportunities', {
        query: { status: 'ROUTED_TO_PRODUCT', limit: 50 },
      }),
    ])

    generatedFlows.value = [
      ...generated.opportunities,
      ...published.opportunities,
      ...routed.opportunities,
    ].filter((item) => item.flowDefinition || item.faqItem || item.routedPageSlug)
  }

  async function fetchOpportunities() {
    const response = await $fetch<{ opportunities: OpportunityItem[] }>('/api/opportunity/opportunities', {
      query: { limit: 50 },
    })
    opportunities.value = response.opportunities
  }

  async function fetchStatistics() {
    statistics.value = await $fetch<OpportunityStatistics>('/api/opportunity/statistics')
  }

  async function publishImportedFlow(id: string) {
    const link = importedFlowLinks.value[id]
    if (!link) {
      error.value = 'Importeer eerst de flow naar Besliswijzer.'
      return null
    }

    publishingFlowId.value = id
    error.value = ''
    successMessage.value = ''

    try {
      const result = await useAdminFetch<{ versionNumber: number }>(
        `/api/v1/admin/flows/${link.flowId}/publish`,
        { method: 'POST' },
      )
      await $fetch(`/api/opportunity/opportunities/${id}/publish`, { method: 'POST' })
      successMessage.value = `Flow "${link.slug}" gepubliceerd als v${result.versionNumber}.`
      await refreshOpportunityData()
      return result
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Publiceren mislukt.')
      return null
    } finally {
      publishingFlowId.value = null
    }
  }

  async function refreshOpportunityData() {
    await Promise.all([fetchOpportunities(), fetchGeneratedFlows(), fetchStatistics()])
    await syncImportedFlowLinks()
    await syncProductMatches()
    await syncImportedProductFlowLinks()
  }

  const productGroups = computed(() =>
    groupOpportunitiesByProduct(
      [...generatedFlows.value, ...opportunities.value],
      productMatches.value,
    ).map((group) => ({
      ...group,
      pageSlug: group.pageSlug ?? generatedProductPages.value[group.key]?.pageSlug ?? null,
    })),
  )

  const filteredOpportunities = computed(() => {
    if (tableFilter.value === 'with_flow') {
      return opportunities.value.filter(
        (item) =>
          item.status === 'FLOW_GENERATED' ||
          item.status === 'PUBLISHED' ||
          item.status === 'ROUTED_TO_PRODUCT' ||
          item.flowDefinition ||
          item.routedPageSlug,
      )
    }
    if (tableFilter.value === 'new') {
      return opportunities.value.filter((item) => item.status === 'NEW')
    }
    return opportunities.value
  })

  async function load() {
    loading.value = true
    error.value = ''
    successMessage.value = ''
    try {
      await refreshOpportunityData()
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Kon geen data ophalen van de Opportunity Engine.')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    generatingFlowId,
    error,
    lastDiscovery,
    discoverySteps,
    opportunities,
    generatedFlows,
    filteredOpportunities,
    statistics,
    successMessage,
    tableFilter,
    importingFlowId,
    publishingFlowId,
    routingOpportunityId,
    generatingProductPageId,
    generatingProductFlowKey,
    importingProductFlowKey,
    generatingProductPageKey,
    importedFlowLinks,
    importedProductFlowLinks,
    productFlowDrafts,
    routedPageLinks,
    generatedPageLinks,
    generatedProductPages,
    productMatches,
    productGroups,
    canGenerateProductPageForProduct,
    importToBesliswijzer,
    publishImportedFlow,
    generateProductFlow,
    importProductFlow,
    generateProductPage,
    generateProductPageForProduct,
    routeToProductPage,
    canGenerateProductPage,
    startDiscovery,
    generateFlows,
    generateFlow,
    load,
  }
}
