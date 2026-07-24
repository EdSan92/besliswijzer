<script setup lang="ts">
import { resolveImportedFlowSlug } from '~/utils/convert-opportunity-flow'
import { isOpportunityFlowDefinition } from '~/utils/opportunity-flow'
import type { OpportunityItem } from '~/types/opportunity'
import { resolveProductFlowSlug } from '~/utils/group-opportunities-by-product'
import type { ProductOpportunityGroup } from '~/utils/group-opportunities-by-product'

definePageMeta({ middleware: 'admin' })

const {
  loading,
  generatingFlowId,
  error,
  successMessage,
  lastDiscovery,
  discoverySteps,
  opportunities,
  generatedFlows,
  filteredOpportunities,
  statistics,
  tableFilter,
  importingFlowId,
  publishingFlowId,
  routingOpportunityId,
  generatingProductPageId,
  importedFlowLinks,
  routedPageLinks,
  generatedPageLinks,
  productMatches,
  startDiscovery,
  generateFlows,
  generateFlow,
  importToBesliswijzer,
  publishImportedFlow,
  generateProductPage,
  generateProductFlow,
  importProductFlow,
  generateProductPageForProduct,
  routeToProductPage,
  canGenerateProductPage,
  canGenerateProductPageForProduct,
  productGroups,
  importedProductFlowLinks,
  productFlowDrafts,
  generatingProductFlowKey,
  importingProductFlowKey,
  generatingProductPageKey,
  generatedProductPages,
  load,
} = useOpportunityEngine()

useHead({ title: 'Opportunity Discovery — Admin' })

onMounted(() => {
  load()
})

const selectedOpportunityId = ref<string | null>(null)

const selectedOpportunity = computed(() =>
  opportunities.value.find((item) => item.id === selectedOpportunityId.value) ?? null,
)

const selectedFlow = computed(() => {
  const definition = selectedOpportunity.value?.flowDefinition
  return isOpportunityFlowDefinition(definition) ? definition : null
})

function toggleFlowView(id: string) {
  selectedOpportunityId.value = selectedOpportunityId.value === id ? null : id
}

async function handleGenerateFlow(id: string) {
  await generateFlow(id)
  selectedOpportunityId.value = id
}

const statusLabel: Record<string, string> = {
  NEW: 'Nieuw',
  FLOW_GENERATED: 'Flow gegenereerd',
  PUBLISHED: 'Gepubliceerd',
  ROUTED_TO_PRODUCT: 'Op productpagina',
  REJECTED: 'Afgewezen',
}

function canRouteToProduct(item: OpportunityItem): boolean {
  return item.status !== 'ROUTED_TO_PRODUCT' && Boolean(productMatches.value[item.id]?.pageSlug)
}

function routeButtonLabel(item: OpportunityItem): string {
  if (routingOpportunityId.value === item.id) return 'Routeren…'
  if (item.status === 'ROUTED_TO_PRODUCT') return 'Opnieuw naar FAQ'
  const match = productMatches.value[item.id]
  if (match?.pageSlug) return `Voeg toe aan /${match.pageSlug}`
  return 'Voeg toe aan productpagina'
}

function generateProductPageButtonLabel(item: OpportunityItem): string {
  if (generatingProductPageId.value === item.id) return 'Genereren…'
  if (generatedPageLinks.value[item.id]) return 'Pagina gegenereerd'
  return 'Genereer productpagina'
}

function generateProductPageTitle(item: OpportunityItem): string | undefined {
  if (canGenerateProductPage(item)) return undefined
  if (!importedFlowLinks.value[item.id]?.flowId) {
    return 'Importeer eerst de flow naar Besliswijzer'
  }
  if (productMatches.value[item.id]?.pageSlug || item.routedPageSlug || generatedPageLinks.value[item.id]) {
    return 'Er bestaat al een productpagina voor deze opportunity'
  }
  return undefined
}

function flowLiveSlug(item: OpportunityItem): string | null {
  if (!isOpportunityFlowDefinition(item.flowDefinition)) return null
  return resolveImportedFlowSlug(item.flowDefinition)
}

function importButtonLabel(item: OpportunityItem): string {
  if (importingFlowId.value === item.id) return 'Importeren…'
  if (importedFlowLinks.value[item.id]) return 'Opnieuw importeren (draft)'
  return 'Importeer als draft'
}

function importPublishButtonLabel(item: OpportunityItem): string {
  if (importingFlowId.value === item.id) return 'Importeren…'
  if (item.status === 'PUBLISHED' || importedFlowLinks.value[item.id]) return 'Opnieuw importeren & publiceren'
  return 'Importeer & publiceren'
}

function publishButtonLabel(item: OpportunityItem): string {
  if (publishingFlowId.value === item.id) return 'Publiceren…'
  if (item.status === 'PUBLISHED') return 'Opnieuw publiceren'
  return 'Publiceren'
}

function importTableButtonLabel(item: OpportunityItem): string {
  if (importingFlowId.value === item.id) return 'Importeren…'
  if (importedFlowLinks.value[item.id]) return 'Draft'
  return 'Draft'
}

function importPublishTableButtonLabel(item: OpportunityItem): string {
  if (importingFlowId.value === item.id) return 'Importeren…'
  return item.status === 'PUBLISHED' ? 'Opnieuw live' : 'Publiceren'
}

function flowTitle(item: { flowDefinition?: unknown; keywordTerm: string }) {
  if (isOpportunityFlowDefinition(item.flowDefinition)) {
    return item.flowDefinition.title
  }
  return item.keywordTerm
}

function productFlowDraftLabel(group: ProductOpportunityGroup): string {
  if (generatingProductFlowKey.value === group.key) return 'Flow genereren…'
  if (productFlowDrafts.value[group.key]) return 'Flow opnieuw genereren'
  return `Genereer flow (${group.keywords.length} keywords)`
}

function importProductFlowLabel(group: ProductOpportunityGroup): string {
  if (importingProductFlowKey.value === group.key) return 'Importeren…'
  if (importedProductFlowLinks.value[group.key]) return 'Flow opnieuw importeren'
  return 'Importeer flow'
}

function productPageLabel(group: ProductOpportunityGroup): string {
  if (generatingProductPageKey.value === group.key) return 'Pagina genereren…'
  if (group.pageSlug || generatedProductPages.value[group.key]) return 'Pagina bestaat'
  return 'Genereer productpagina'
}
</script>

<template>
  <AdminLayout>
    <header class="opportunities-page__header">
      <h1>Opportunity Discovery</h1>
      <p class="opportunities-page__intro">
        Discovery vindt webshop-keywords en groepeert ze per product. Maak één samengevoegde flow per
        productpagina — geen aparte flow per zoekwoord.
      </p>
    </header>

    <section class="card opportunities-page__flow">
      <OpportunityDiscoveryPipeline :steps="discoverySteps" :loading="loading" />
      <GeminiApiFlowVisualizer
        title="Stap-voor-stap"
        :steps="discoverySteps"
        :loading="loading"
      />
    </section>

    <section class="card opportunities-page__actions">
      <div class="opportunities-page__action-row">
        <button type="button" class="btn" :disabled="loading" @click="startDiscovery">
          {{ loading ? 'Bezig…' : 'Start discovery' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="loading"
          @click="generateFlows(5)"
        >
          Genereer flows (legacy)
        </button>
      </div>
      <p v-if="error" class="opportunities-page__error" role="alert">{{ error }}</p>
      <p v-if="successMessage" class="opportunities-page__success" role="status">{{ successMessage }}</p>
    </section>

    <section v-if="lastDiscovery" class="card opportunities-page__result">
      <h2>Laatste discovery</h2>
      <dl class="opportunities-page__stats">
        <div>
          <dt>Seed categorieën</dt>
          <dd>{{ lastDiscovery.seedCategories }}</dd>
        </div>
        <div>
          <dt>Keywords verzameld</dt>
          <dd>{{ lastDiscovery.keywordsCollected }}</dd>
        </div>
        <div>
          <dt>Opportunities gevonden</dt>
          <dd>{{ lastDiscovery.opportunitiesFound }}</dd>
        </div>
        <div>
          <dt>Opgeslagen</dt>
          <dd>{{ lastDiscovery.opportunitiesStored }}</dd>
        </div>
        <div>
          <dt>FAQ's gerouteerd</dt>
          <dd>{{ lastDiscovery.faqsRouted }}</dd>
        </div>
        <div>
          <dt>FAQ's overgeslagen</dt>
          <dd>{{ lastDiscovery.faqsSkipped }}</dd>
        </div>
        <div v-if="lastDiscovery.flowsGenerated > 0">
          <dt>Flows gegenereerd (legacy)</dt>
          <dd>{{ lastDiscovery.flowsGenerated }}</dd>
        </div>
        <div>
          <dt>API batches</dt>
          <dd>{{ lastDiscovery.apiBatches }}</dd>
        </div>
        <div>
          <dt>Uit cache</dt>
          <dd>{{ lastDiscovery.scoresFromCache }}</dd>
        </div>
        <div>
          <dt>Duur</dt>
          <dd>{{ (lastDiscovery.durationMs / 1000).toFixed(1) }}s</dd>
        </div>
      </dl>
      <ul v-if="lastDiscovery.errors.length" class="opportunities-page__errors">
        <li v-for="(item, index) in lastDiscovery.errors" :key="index">{{ item }}</li>
      </ul>
    </section>

    <section v-if="statistics" class="card">
      <h2>Statistieken</h2>
      <div class="opportunities-page__stats">
        <div>
          <span class="opportunities-page__stat-label">Nieuw</span>
          <span class="opportunities-page__stat-value">{{ statistics.opportunities.NEW ?? 0 }}</span>
        </div>
        <div>
          <span class="opportunities-page__stat-label">Flow gegenereerd</span>
          <span class="opportunities-page__stat-value">{{ statistics.opportunities.FLOW_GENERATED ?? 0 }}</span>
        </div>
        <div>
          <span class="opportunities-page__stat-label">Op productpagina</span>
          <span class="opportunities-page__stat-value">{{ statistics.opportunities.ROUTED_TO_PRODUCT ?? 0 }}</span>
        </div>
        <div>
          <span class="opportunities-page__stat-label">Gepubliceerd (flow)</span>
          <span class="opportunities-page__stat-value">{{ statistics.opportunities.PUBLISHED ?? 0 }}</span>
        </div>
        <div>
          <span class="opportunities-page__stat-label">AI calls (30d)</span>
          <span class="opportunities-page__stat-value">{{ statistics.ai.total }}</span>
        </div>
      </div>
    </section>

    <section v-if="productGroups.length" class="card opportunities-page__products">
      <div class="opportunities-page__generated-head">
        <h2>Producten ({{ productGroups.length }})</h2>
        <p class="opportunities-page__generated-intro">
          Eén samengevoegde keuzehulp per product — alle gerelateerde zoekwoorden in één flow op één productpagina.
        </p>
      </div>

      <div class="opportunities-page__generated-list">
        <article
          v-for="group in productGroups"
          :key="group.key"
          class="opportunities-page__generated-card opportunities-page__product-card"
        >
          <div>
            <strong>{{ group.productTitle }}</strong>
            <span class="opportunities-page__generated-meta">
              {{ group.categoryTitle }} · {{ group.keywords.length }} zoekwoorden · flow
              {{ resolveProductFlowSlug(group.productSlug) }}
            </span>
            <span v-if="group.pageSlug" class="opportunities-page__generated-slug">
              → /{{ group.pageSlug }}
            </span>
            <ul class="opportunities-page__keyword-list">
              <li v-for="keyword in group.keywords" :key="keyword">{{ keyword }}</li>
            </ul>
          </div>
          <div class="opportunities-page__generated-actions">
            <button
              type="button"
              class="btn opportunities-page__row-btn"
              :disabled="generatingProductFlowKey === group.key"
              @click="generateProductFlow(group.key)"
            >
              {{ productFlowDraftLabel(group) }}
            </button>
            <button
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              :disabled="importingProductFlowKey === group.key || !productFlowDrafts[group.key]"
              :title="!productFlowDrafts[group.key] ? 'Genereer eerst een samengevoegde flow' : undefined"
              @click="importProductFlow(group.key, false)"
            >
              {{ importProductFlowLabel(group) }}
            </button>
            <button
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              :disabled="importingProductFlowKey === group.key || !productFlowDrafts[group.key]"
              @click="importProductFlow(group.key, true)"
            >
              Importeer &amp; publiceer
            </button>
            <button
              type="button"
              class="btn opportunities-page__row-btn"
              :disabled="generatingProductPageKey === group.key || !canGenerateProductPageForProduct(group)"
              :title="!importedProductFlowLinks[group.key] ? 'Importeer eerst de samengevoegde flow' : undefined"
              @click="generateProductPageForProduct(group.key)"
            >
              {{ productPageLabel(group) }}
            </button>
            <NuxtLink
              v-if="group.pageSlug"
              class="btn btn-secondary opportunities-page__row-btn"
              :to="`/${group.pageSlug}`"
              target="_blank"
            >
              Bekijk pagina
            </NuxtLink>
            <NuxtLink
              v-if="group.pageSlug || generatedProductPages[group.key]"
              class="btn btn-secondary opportunities-page__row-btn"
              :to="`/admin/product-pages/${group.pageSlug ?? generatedProductPages[group.key]?.pageSlug}/preview`"
            >
              Beheer pagina
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <section class="card opportunities-page__generated">
      <div class="opportunities-page__generated-head">
        <h2>Opportunities &amp; content ({{ generatedFlows.length }})</h2>
        <p class="opportunities-page__generated-intro">
          Per keyword: route FAQ's naar de productpagina. Gebruik bovenstaande productsectie voor flows en pagina's.
        </p>
      </div>

      <p v-if="!generatedFlows.length && !loading" class="opportunities-page__empty">
        Nog geen verwerkte opportunities. Start discovery om keywords naar productpagina-FAQ's te routeren.
      </p>

      <div v-else class="opportunities-page__generated-list">
        <article
          v-for="item in generatedFlows"
          :key="item.id"
          class="opportunities-page__generated-card"
          :class="{ 'opportunities-page__generated-card--active': selectedOpportunityId === item.id }"
        >
          <div>
            <strong>{{ flowTitle(item) }}</strong>
            <span class="opportunities-page__generated-meta">
              {{ item.categoryName }} · {{ item.keywordTerm }} · score {{ Math.round(item.score) }}
            </span>
            <span
              v-if="productMatches[item.id]"
              class="opportunities-page__generated-slug"
            >
              → {{ productMatches[item.id].productTitle }} ({{ Math.round(productMatches[item.id].confidence * 100) }}%)
            </span>
            <span
              v-else-if="item.routedPageSlug"
              class="opportunities-page__generated-slug"
            >
              → /{{ item.routedPageSlug }}
            </span>
          </div>
          <div class="opportunities-page__generated-actions">
            <button
              v-if="importedFlowLinks[item.id] || canGenerateProductPage(item) || generatedPageLinks[item.id]"
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              :disabled="generatingProductPageId === item.id || !canGenerateProductPage(item)"
              :title="generateProductPageTitle(item)"
              @click="generateProductPage(item.id)"
            >
              {{ generateProductPageButtonLabel(item) }} (legacy)
            </button>
            <button
              v-if="canRouteToProduct(item) || item.status === 'ROUTED_TO_PRODUCT' || productMatches[item.id]"
              type="button"
              class="btn opportunities-page__row-btn"
              :disabled="routingOpportunityId === item.id || !productMatches[item.id]?.pageSlug"
              :title="!productMatches[item.id]?.pageSlug ? 'Geen productpagina gevonden voor dit keyword' : undefined"
              @click="routeToProductPage(item.id)"
            >
              {{ routeButtonLabel(item) }}
            </button>
            <NuxtLink
              v-if="(routedPageLinks[item.id] || item.routedPageSlug) && !generatedPageLinks[item.id]"
              class="btn btn-secondary opportunities-page__row-btn"
              :to="`/${routedPageLinks[item.id]?.pageSlug ?? item.routedPageSlug}`"
              target="_blank"
            >
              Bekijk pagina
            </NuxtLink>
            <button
              v-if="isOpportunityFlowDefinition(item.flowDefinition)"
              type="button"
              class="btn opportunities-page__row-btn"
              :disabled="importingFlowId === item.id || publishingFlowId === item.id"
              @click="importToBesliswijzer(item.id, true)"
            >
              {{ importPublishButtonLabel(item) }} (legacy)
            </button>
            <button
              v-if="isOpportunityFlowDefinition(item.flowDefinition)"
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              :disabled="importingFlowId === item.id || publishingFlowId === item.id"
              @click="importToBesliswijzer(item.id, false)"
            >
              {{ importButtonLabel(item) }}
            </button>
            <button
              v-if="importedFlowLinks[item.id]"
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              :disabled="publishingFlowId === item.id || importingFlowId === item.id"
              @click="publishImportedFlow(item.id)"
            >
              {{ publishButtonLabel(item) }}
            </button>
            <NuxtLink
              v-if="importedFlowLinks[item.id]"
              class="btn btn-secondary opportunities-page__row-btn"
              :to="`/admin/flows/${importedFlowLinks[item.id].flowId}/edit`"
            >
              Bewerken
            </NuxtLink>
            <NuxtLink
              v-else-if="flowLiveSlug(item)"
              class="btn btn-secondary opportunities-page__row-btn"
              :to="`/flows/${flowLiveSlug(item)}`"
              target="_blank"
            >
              Live bekijken
            </NuxtLink>
            <button
              type="button"
              class="btn btn-secondary opportunities-page__row-btn"
              @click="toggleFlowView(item.id)"
            >
              {{ selectedOpportunityId === item.id ? 'Verberg' : 'Bekijk flow' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="card">
      <div class="opportunities-page__table-head">
        <h2>Alle opportunities</h2>
        <div class="opportunities-page__filters">
          <button
            type="button"
            class="chip"
            :class="{ active: tableFilter === 'with_flow' }"
            @click="tableFilter = 'with_flow'"
          >
            Met flow ({{ generatedFlows.length }})
          </button>
          <button
            type="button"
            class="chip"
            :class="{ active: tableFilter === 'new' }"
            @click="tableFilter = 'new'"
          >
            Nieuw
          </button>
          <button
            type="button"
            class="chip"
            :class="{ active: tableFilter === 'all' }"
            @click="tableFilter = 'all'"
          >
            Alles
          </button>
        </div>
      </div>
      <p v-if="!filteredOpportunities.length && !loading" class="opportunities-page__empty">
        Geen opportunities in deze filter.
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Categorie</th>
            <th>Score</th>
            <th>Status</th>
            <th>Actie</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredOpportunities" :key="item.id">
            <td>
              <strong>{{ item.keywordTerm }}</strong>
              <span
                v-if="item.flowDefinition && isOpportunityFlowDefinition(item.flowDefinition)"
                class="opportunities-page__flow-name"
              >
                {{ item.flowDefinition.title }}
              </span>
            </td>
            <td>{{ item.categoryName }}</td>
            <td>{{ Math.round(item.score) }}</td>
            <td>{{ statusLabel[item.status] ?? item.status }}</td>
            <td>
              <div class="opportunities-page__row-actions">
                <button
                  v-if="importedFlowLinks[item.id] || canGenerateProductPage(item) || generatedPageLinks[item.id]"
                  type="button"
                  class="btn opportunities-page__row-btn"
                  :disabled="generatingProductPageId === item.id || !canGenerateProductPage(item)"
                  :title="generateProductPageTitle(item)"
                  @click="generateProductPage(item.id)"
                >
                  {{ generateProductPageButtonLabel(item) }}
                </button>
                <button
                  v-if="productMatches[item.id]?.pageSlug || item.status === 'ROUTED_TO_PRODUCT'"
                  type="button"
                  class="btn opportunities-page__row-btn"
                  :disabled="routingOpportunityId === item.id || !productMatches[item.id]?.pageSlug"
                  @click="routeToProductPage(item.id)"
                >
                  {{ routeButtonLabel(item) }}
                </button>
                <NuxtLink
                  v-if="(routedPageLinks[item.id] || item.routedPageSlug) && !generatedPageLinks[item.id]"
                  class="btn btn-secondary opportunities-page__row-btn"
                  :to="`/${routedPageLinks[item.id]?.pageSlug ?? item.routedPageSlug}`"
                  target="_blank"
                >
                  Pagina
                </NuxtLink>
                <button
                  v-if="item.status === 'NEW'"
                  type="button"
                  class="btn btn-secondary opportunities-page__row-btn"
                  :disabled="generatingFlowId === item.id"
                  @click="handleGenerateFlow(item.id)"
                >
                  {{ generatingFlowId === item.id ? 'Genereren…' : 'Flow (legacy)' }}
                </button>
                <template v-else-if="item.status === 'FLOW_GENERATED' || item.flowDefinition">
                  <button
                    v-if="isOpportunityFlowDefinition(item.flowDefinition)"
                    type="button"
                    class="btn opportunities-page__row-btn"
                    :disabled="importingFlowId === item.id || publishingFlowId === item.id"
                    @click="importToBesliswijzer(item.id, true)"
                  >
                    {{ importPublishTableButtonLabel(item) }}
                  </button>
                  <button
                    v-if="isOpportunityFlowDefinition(item.flowDefinition)"
                    type="button"
                    class="btn btn-secondary opportunities-page__row-btn"
                    :disabled="importingFlowId === item.id || publishingFlowId === item.id"
                    @click="importToBesliswijzer(item.id, false)"
                  >
                    {{ importTableButtonLabel(item) }}
                  </button>
                  <button
                    v-if="importedFlowLinks[item.id]"
                    type="button"
                    class="btn btn-secondary opportunities-page__row-btn"
                    :disabled="publishingFlowId === item.id || importingFlowId === item.id"
                    @click="publishImportedFlow(item.id)"
                  >
                    {{ publishButtonLabel(item) }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary opportunities-page__row-btn"
                    :class="{ 'opportunities-page__row-btn--active': selectedOpportunityId === item.id }"
                    @click="toggleFlowView(item.id)"
                  >
                    {{ selectedOpportunityId === item.id ? 'Verberg' : 'Bekijk' }}
                  </button>
                </template>
                <NuxtLink
                  v-if="importedFlowLinks[item.id]"
                  class="btn btn-secondary opportunities-page__row-btn"
                  :to="`/admin/flows/${importedFlowLinks[item.id].flowId}/edit`"
                >
                  Bewerken
                </NuxtLink>
                <NuxtLink
                  v-else-if="flowLiveSlug(item)"
                  class="btn btn-secondary opportunities-page__row-btn"
                  :to="`/flows/${flowLiveSlug(item)}`"
                  target="_blank"
                >
                  Live
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <section v-if="selectedFlow && selectedOpportunity" class="opportunities-page__flow-detail card">
        <OpportunityFlowMap
          :flow="selectedFlow"
          :keyword="selectedOpportunity.keywordTerm"
        />
      </section>
    </section>
  </AdminLayout>
</template>

<style scoped>
.opportunities-page__header {
  margin-bottom: 1.5rem;
}

.opportunities-page__header h1 {
  margin: 0 0 0.5rem;
}

.opportunities-page__intro {
  margin: 0;
  color: var(--color-muted);
}

.opportunities-page__flow {
  margin-bottom: 1.5rem;
  display: grid;
  gap: 1.5rem;
}

.opportunities-page__actions {
  margin-bottom: 1.5rem;
}

.opportunities-page__action-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.opportunities-page__row-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

.opportunities-page__row-btn--active {
  background: #eff6ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.opportunities-page__flow-detail {
  margin-top: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: #fafbfc;
}

.opportunities-page__error {
  margin: 1rem 0 0;
  color: #dc2626;
}

.opportunities-page__success {
  margin: 1rem 0 0;
  color: var(--color-success);
}

.opportunities-page__product-card {
  border-color: #93c5fd;
  background: #eff6ff;
}

.opportunities-page__keyword-list {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.opportunities-page__products {
  margin-bottom: 1.5rem;
}

.opportunities-page__generated {
  margin-bottom: 1.5rem;
}

.opportunities-page__generated-head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
}

.opportunities-page__generated-intro {
  margin: 0 0 1rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.opportunities-page__generated-list {
  display: grid;
  gap: 0.75rem;
}

.opportunities-page__generated-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #86efac;
  border-radius: var(--radius);
  background: #f0fdf4;
}

.opportunities-page__generated-actions,
.opportunities-page__row-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.opportunities-page__generated-card--active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.opportunities-page__generated-meta,
.opportunities-page__generated-slug {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.opportunities-page__generated-slug {
  font-family: ui-monospace, monospace;
}

.opportunities-page__table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.opportunities-page__table-head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.opportunities-page__filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: white;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
}

.chip.active {
  background: #eff6ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}

.opportunities-page__flow-name {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--color-success);
  font-weight: 600;
}

.opportunities-page__result {
  margin-bottom: 1.5rem;
}

.opportunities-page__result h2,
.card h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.opportunities-page__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.opportunities-page__stats dt {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.opportunities-page__stats dd,
.opportunities-page__stat-value {
  margin: 0.2rem 0 0;
  font-size: 1.4rem;
  font-weight: 700;
  display: block;
}

.opportunities-page__stat-label {
  font-size: 0.8rem;
  color: var(--color-muted);
  display: block;
}

.opportunities-page__errors {
  margin: 1rem 0 0;
  padding-left: 1.2rem;
  color: #dc2626;
  font-size: 0.9rem;
}

.opportunities-page__empty {
  color: var(--color-muted);
  margin: 0;
}

.card + .card {
  margin-top: 1.5rem;
}
</style>
