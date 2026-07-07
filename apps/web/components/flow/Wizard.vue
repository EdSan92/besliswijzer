<script setup lang="ts">
import type { PublicFlowResponse } from '@besliswijzer/flow-schema'
import {
  calculateProgress,
  getAnswerValidationError,
  normalizeAnswer,
  prepareAnswer,
  resolveNext,
} from '@besliswijzer/flow-engine'

const props = defineProps<{
  flow: PublicFlowResponse
  versionQuery?: string
  previewSnapshot?: import('@besliswijzer/flow-schema').FlowSnapshot
}>()

const store = useFlowSessionStore()
const { track } = useFlowAnalytics()
const apiBase = useApiBase()

const currentAnswer = ref<unknown>(null)
const submitting = ref(false)

onMounted(() => {
  store.initFromFlow({
    slug: props.flow.slug,
    flowId: props.flow.flowId,
    versionId: props.flow.versionId,
    versionNumber: props.flow.versionNumber,
    entryNode: props.flow.entryNode,
  })

  track(props.flow.flowId, props.flow.versionId, store.sessionId, 'flow_start', undefined, {
    referrer: document.referrer,
    utm: Object.fromEntries(new URLSearchParams(window.location.search)),
  })

  track(
    props.flow.flowId,
    props.flow.versionId,
    store.sessionId,
    'step_view',
    props.flow.entryNode.nodeKey,
  )
})

watch(
  () => store.currentNode?.nodeKey,
  (nodeKey) => {
    if (nodeKey) {
      currentAnswer.value = store.answers[nodeKey] ?? null
      track(props.flow.flowId, props.flow.versionId, store.sessionId, 'step_view', nodeKey)
    }
  },
)

async function submitAnswer(answer: unknown) {
  if (!store.currentNode || submitting.value) return

  const node = store.currentNode
  const nodeKey = node.nodeKey
  const preparedAnswer = prepareAnswer(node, answer)
  const validationError = getAnswerValidationError(node, answer)

  if (validationError) {
    store.error = validationError
    return
  }

  submitting.value = true
  store.error = null
  store.answers[nodeKey] = preparedAnswer

  try {
    track(props.flow.flowId, props.flow.versionId, store.sessionId, 'step_complete', nodeKey, {
      answer: preparedAnswer,
    })

    if (
      node.type === 'lead_capture' &&
      typeof preparedAnswer === 'string' &&
      preparedAnswer.includes('@')
    ) {
      await submitLead(preparedAnswer)
    }

    if (props.previewSnapshot) {
      const normalized = normalizeAnswer(node, preparedAnswer)
      store.answers[nodeKey] = normalized
      const next = resolveNext(props.previewSnapshot, store.answers, nodeKey)
      store.progress = calculateProgress(props.previewSnapshot, Object.keys(store.answers))

      if (next.type === 'node') {
        store.setNode(next.node)
      } else if (next.type === 'result') {
        store.setResult(next.result)
        track(props.flow.flowId, props.flow.versionId, store.sessionId, 'flow_complete', undefined, {
          resultKey: next.resultKey,
        })
      } else {
        store.completed = true
      }
    } else {
      const versionParam = props.versionQuery ? `?v=${props.versionQuery}` : ''
      const response = await $fetch<{
        next: { type: string; nodeKey?: string; node?: typeof store.currentNode; result?: unknown }
        progress: number
      }>(`${apiBase}/api/v1/public/flows/${props.flow.slug}/step${versionParam}`, {
        method: 'POST',
        body: {
          sessionId: store.sessionId,
          nodeKey,
          answer: preparedAnswer,
          answers: store.answers,
        },
      })

      store.progress = response.progress

      if (response.next.type === 'node' && response.next.node) {
        store.setNode(response.next.node)
      } else if (response.next.type === 'result' && response.next.result) {
        store.setResult(response.next.result as Parameters<typeof store.setResult>[0])
        track(
          props.flow.flowId,
          props.flow.versionId,
          store.sessionId,
          'flow_complete',
          undefined,
          { resultKey: (response.next.result as { resultKey: string }).resultKey },
        )
      } else {
        store.completed = true
      }
    }
  } catch (err) {
    store.error = toUserFacingFetchError(err)
  } finally {
    submitting.value = false
  }
}

async function submitLead(email: string) {
  await $fetch(`${apiBase}/api/v1/public/flows/${props.flow.slug}/leads`, {
    method: 'POST',
    body: {
      sessionId: store.sessionId,
      email,
      answers: store.answers,
      honeypot: '',
    },
  })
}
</script>

<template>
  <div class="flow-wizard card">
    <div v-if="!store.completed" class="progress-bar">
      <div class="progress-bar__fill" :style="{ width: `${store.progress}%` }" />
    </div>

    <p v-if="store.error" class="error">{{ store.error }}</p>

    <FlowResultView
      v-if="store.currentResult"
      :result="store.currentResult"
      :flow-id="store.flowId"
      :version-id="store.versionId"
      :session-id="store.sessionId"
    />

    <FlowQuestionRenderer
      v-else-if="store.currentNode"
      :node="store.currentNode"
      :submitting="submitting"
      v-model="currentAnswer"
      @submit="submitAnswer"
    />
  </div>
</template>

<style scoped>
.error {
  color: #dc2626;
  margin-bottom: 1rem;
}
</style>
