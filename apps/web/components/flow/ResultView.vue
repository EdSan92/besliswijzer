<script setup lang="ts">
import type { FlowResult } from '@besliswijzer/flow-schema'

const props = defineProps<{
  result: FlowResult
  flowId: string
  versionId: string
  sessionId: string
}>()

const { track } = useFlowAnalytics()

const whyText = computed(() => {
  const why = props.result.body.why
  return typeof why === 'string' && why.trim() ? why : null
})

const modelExamples = computed(() => {
  const models = props.result.body.voorbeeldmodellen
  return Array.isArray(models)
    ? models.filter((model): model is string => typeof model === 'string' && model.trim().length > 0)
    : []
})

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

    <section v-if="whyText" class="result-section">
      <h2 class="section-title">Waarom dit advies?</h2>
      <p>{{ whyText }}</p>
    </section>

    <section v-if="Array.isArray(result.body.checklist)" class="result-section">
      <h2 class="section-title">Waar op letten</h2>
      <ul class="checklist">
        <li v-for="(item, index) in result.body.checklist" :key="index">{{ item }}</li>
      </ul>
    </section>

    <section v-if="modelExamples.length" class="result-section">
      <h2 class="section-title">Voorbeeldmodellen</h2>
      <ul class="model-list">
        <li v-for="(model, index) in modelExamples" :key="index">{{ model }}</li>
      </ul>
    </section>

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
.result-section {
  margin-top: 1.5rem;
}

.section-title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
}

.checklist,
.model-list {
  margin: 0;
  padding-left: 1.25rem;
}

.model-list {
  list-style: disc;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
