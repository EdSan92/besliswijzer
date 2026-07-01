<script setup lang="ts">
import type { FlowResult } from '@besliswijzer/flow-schema'

const props = defineProps<{
  result: FlowResult
  flowId: string
  versionId: string
  sessionId: string
}>()

const { track } = useFlowAnalytics()

function onCtaClick(cta: FlowResult['ctas'][number]) {
  track(props.flowId, props.versionId, props.sessionId, 'cta_click', undefined, {
    ctaId: cta.id,
    resultKey: props.result.resultKey,
    trackingId: cta.trackingId,
  })
}
</script>

<template>
  <div class="result-view">
    <h1>{{ result.title }}</h1>
    <p v-if="result.body.summary">{{ result.body.summary }}</p>

    <ul v-if="Array.isArray(result.body.checklist)" class="checklist">
      <li v-for="(item, index) in result.body.checklist" :key="index">{{ item }}</li>
    </ul>

    <div class="cta-row">
      <a
        v-for="cta in result.ctas"
        :key="cta.id"
        :href="cta.url"
        class="btn"
        :class="{ 'btn-secondary': cta.type === 'external' }"
        target="_blank"
        rel="noopener noreferrer"
        @click="onCtaClick(cta)"
      >
        {{ cta.label }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.checklist {
  padding-left: 1.25rem;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
