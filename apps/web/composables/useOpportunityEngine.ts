import type { DiscoveryResult, FlowStep, OpportunityItem, OpportunityStatistics } from '~/types/opportunity'

const DISCOVERY_PIPELINE: Array<{ id: string; label: string }> = [
  { id: 'load-seeds', label: 'Seed categorieën laden' },
  { id: 'collect-keywords', label: 'Keywords verzamelen per categorie' },
  { id: 'score-keywords', label: 'Keywords scoren (batch + cache)' },
  { id: 'store-opportunities', label: 'Opportunities opslaan' },
  { id: 'generate-flows', label: 'Beslis-flows genereren' },
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
  const statistics = ref<OpportunityStatistics | null>(null)

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
    lastDiscovery.value = null
    startProgressAnimation()

    try {
      const result = await $fetch<DiscoveryResult>('/api/opportunity/opportunities/discover', {
        method: 'POST',
        body: {},
      })
      lastDiscovery.value = result
      discoverySteps.value = result.steps
      await fetchOpportunities()
      await fetchStatistics()
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
      }

      await fetchOpportunities()
      await fetchStatistics()
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
      await fetchOpportunities()
      await fetchStatistics()
    } catch (err) {
      error.value = toUserFacingFetchError(err, 'Flow genereren mislukt.')
    } finally {
      generatingFlowId.value = null
    }
  }

  async function fetchOpportunities() {
    const response = await $fetch<{ opportunities: OpportunityItem[] }>('/api/opportunity/opportunities', {
      query: { limit: 20 },
    })
    opportunities.value = response.opportunities
  }

  async function fetchStatistics() {
    statistics.value = await $fetch<OpportunityStatistics>('/api/opportunity/statistics')
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      await Promise.all([fetchOpportunities(), fetchStatistics()])
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
    statistics,
    startDiscovery,
    generateFlows,
    generateFlow,
    load,
  }
}
