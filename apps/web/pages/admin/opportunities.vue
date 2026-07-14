<script setup lang="ts">
import { isOpportunityFlowDefinition } from '~/utils/opportunity-flow'

definePageMeta({ middleware: 'admin' })

const {
  loading,
  generatingFlowId,
  error,
  lastDiscovery,
  discoverySteps,
  opportunities,
  statistics,
  startDiscovery,
  generateFlows,
  generateFlow,
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
  REJECTED: 'Afgewezen',
}
</script>

<template>
  <AdminLayout>
    <header class="opportunities-page__header">
      <h1>Opportunity Discovery</h1>
      <p class="opportunities-page__intro">
        Discovery vindt webshop-producten (direct online koopbaar) en genereert automatisch
        flows voor de top 5. Geen installatieproducten zoals warmtepompen of zonnepanelen.
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
          Genereer 5 flows
        </button>
      </div>
      <p v-if="error" class="opportunities-page__error" role="alert">{{ error }}</p>
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
          <dt>Flows gegenereerd</dt>
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
          <span class="opportunities-page__stat-label">Gepubliceerd</span>
          <span class="opportunities-page__stat-value">{{ statistics.opportunities.PUBLISHED ?? 0 }}</span>
        </div>
        <div>
          <span class="opportunities-page__stat-label">AI calls (30d)</span>
          <span class="opportunities-page__stat-value">{{ statistics.ai.total }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Opportunities</h2>
      <p v-if="!opportunities.length && !loading" class="opportunities-page__empty">
        Nog geen opportunities. Start een discovery-run.
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
          <tr v-for="item in opportunities" :key="item.id">
            <td>{{ item.keywordTerm }}</td>
            <td>{{ item.categoryName }}</td>
            <td>{{ Math.round(item.score) }}</td>
            <td>{{ statusLabel[item.status] ?? item.status }}</td>
            <td>
              <button
                v-if="item.status === 'NEW'"
                type="button"
                class="btn btn-secondary opportunities-page__row-btn"
                :disabled="generatingFlowId === item.id"
                @click="handleGenerateFlow(item.id)"
              >
                {{ generatingFlowId === item.id ? 'Genereren…' : 'Flow genereren' }}
              </button>
              <button
                v-else-if="item.flowDefinition"
                type="button"
                class="btn btn-secondary opportunities-page__row-btn"
                :class="{ 'opportunities-page__row-btn--active': selectedOpportunityId === item.id }"
                @click="toggleFlowView(item.id)"
              >
                {{ selectedOpportunityId === item.id ? 'Verberg flow' : 'Bekijk flow' }}
              </button>
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
