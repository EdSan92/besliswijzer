import type { EventType } from '@besliswijzer/flow-schema'

export function useFlowAnalytics() {
  const apiBase = useApiBase()

  const queue: Array<{
    flowId: string
    flowVersionId: string
    sessionId: string
    eventType: EventType
    nodeKey?: string
    metadata?: Record<string, unknown>
  }> = []

  function track(
    flowId: string,
    flowVersionId: string,
    sessionId: string,
    eventType: EventType,
    nodeKey?: string,
    metadata?: Record<string, unknown>,
  ) {
    queue.push({ flowId, flowVersionId, sessionId, eventType, nodeKey, metadata })
    flush()
  }

  async function flush() {
    if (queue.length === 0) return
    const events = [...queue]
    queue.length = 0

    const payload = JSON.stringify({ events })

    if (import.meta.client && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(`${apiBase}/api/v1/public/analytics/events`, blob)
      return
    }

    try {
      await $fetch(`${apiBase}/api/v1/public/analytics/events`, {
        method: 'POST',
        body: { events },
      })
    } catch {
      queue.push(...events)
    }
  }

  if (import.meta.client) {
    window.addEventListener('beforeunload', () => flush())
  }

  return { track, flush }
}
