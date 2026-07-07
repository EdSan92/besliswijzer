import { defineStore } from 'pinia'
import type { FlowNode, FlowResult } from '@besliswijzer/flow-schema'

function createSessionId(): string {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (import.meta.client) {
    const stored = localStorage.getItem('de_session_id')
    if (stored && uuidPattern.test(stored)) {
      return stored
    }
    const id = crypto.randomUUID()
    localStorage.setItem('de_session_id', id)
    return id
  }
  return crypto.randomUUID()
}

export const useFlowSessionStore = defineStore('flowSession', {
  state: () => ({
    sessionId: createSessionId(),
    slug: '' as string,
    flowId: '' as string,
    versionId: '' as string,
    versionNumber: 0,
    answers: {} as Record<string, unknown>,
    currentNode: null as FlowNode | null,
    currentResult: null as FlowResult | null,
    history: [] as string[],
    progress: 0,
    loading: false,
    error: null as string | null,
    completed: false,
  }),

  actions: {
    initFromFlow(flow: {
      slug: string
      flowId: string
      versionId: string
      versionNumber: number
      entryNode: FlowNode
    }) {
      this.slug = flow.slug
      this.flowId = flow.flowId
      this.versionId = flow.versionId
      this.versionNumber = flow.versionNumber
      this.currentNode = flow.entryNode
      this.answers = {}
      this.history = [flow.entryNode.nodeKey]
      this.currentResult = null
      this.progress = 0
      this.completed = false
      this.error = null
    },

    setNode(node: FlowNode) {
      this.currentNode = node
      if (!this.history.includes(node.nodeKey)) {
        this.history.push(node.nodeKey)
      }
    },

    setResult(result: FlowResult) {
      this.currentResult = result
      this.currentNode = null
      this.completed = true
      this.progress = 100
    },

    goBack() {
      if (this.history.length <= 1) return
      this.history.pop()
      const previousKey = this.history[this.history.length - 1]
      // Client-side back only updates UI state; full replay would need server
      this.completed = false
      this.currentResult = null
      return previousKey
    },

    reset() {
      this.answers = {}
      this.history = []
      this.currentNode = null
      this.currentResult = null
      this.progress = 0
      this.completed = false
      this.error = null
    },
  },
})
