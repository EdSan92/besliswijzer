import type { FlowSearchResult } from '@besliswijzer/flow-schema'

export function useFlowSearch() {
  const apiBase = useApiBase()
  const query = ref('')
  const results = ref<FlowSearchResult[]>([])
  const loading = ref(false)
  const open = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  function clearDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  async function search(term: string) {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      results.value = []
      open.value = false
      loading.value = false
      return
    }

    const currentRequest = ++requestId
    loading.value = true

    try {
      const data = await $fetch<{ flows: FlowSearchResult[] }>(
        `${apiBase}/api/v1/public/flows/search?q=${encodeURIComponent(trimmed)}&limit=8`,
      )

      if (currentRequest !== requestId) return

      results.value = data.flows
      open.value = true
    } catch {
      if (currentRequest !== requestId) return
      results.value = []
      open.value = false
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
      }
    }
  }

  watch(query, (value) => {
    clearDebounce()
    const trimmed = value.trim()

    if (trimmed.length < 2) {
      results.value = []
      open.value = false
      loading.value = false
      return
    }

    debounceTimer = setTimeout(() => search(trimmed), 250)
  })

  function close() {
    open.value = false
  }

  function reset() {
    query.value = ''
    results.value = []
    open.value = false
    loading.value = false
    clearDebounce()
  }

  onUnmounted(clearDebounce)

  return { query, results, loading, open, close, reset }
}
