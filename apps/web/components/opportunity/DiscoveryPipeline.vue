<script setup lang="ts">
import type { FlowStep } from '~/types/opportunity'

const props = defineProps<{
  steps?: FlowStep[]
  loading?: boolean
}>()

const pipelineNodes = [
  { id: 'load-seeds', label: 'Seed categorieën', hint: 'Database' },
  { id: 'collect-keywords', label: 'Keywords', hint: 'Gemini + mock data' },
  { id: 'score-keywords', label: 'Scoring', hint: 'Batch + cache' },
  { id: 'store-opportunities', label: 'Opslaan', hint: 'Database' },
  { id: 'generate-flows', label: 'Flows', hint: 'Gemini (top 5)' },
  { id: 'save-run', label: 'Afronden', hint: 'Log + stats' },
] as const

function nodeStatus(id: string): FlowStep['status'] {
  const step = props.steps?.find((item) => item.id === id)
  if (step) return step.status
  if (props.loading) return 'pending'
  return 'pending'
}
</script>

<template>
  <div class="discovery-pipeline">
    <h2 class="discovery-pipeline__title">Discovery pipeline</h2>
    <p class="discovery-pipeline__intro">
      Van webshop-seedcategorie tot kant-en-klare beslis-flow — elke stap hieronder wordt uitgevoerd
      bij &ldquo;Start discovery&rdquo;.
    </p>

    <div class="discovery-pipeline__track" role="list" aria-label="Discovery stappen">
      <template v-for="(node, index) in pipelineNodes" :key="node.id">
        <div
          role="listitem"
          class="discovery-pipeline__node"
          :class="`discovery-pipeline__node--${nodeStatus(node.id)}`"
        >
          <span class="discovery-pipeline__node-label">{{ node.label }}</span>
          <span class="discovery-pipeline__node-hint">{{ node.hint }}</span>
        </div>
        <span
          v-if="index < pipelineNodes.length - 1"
          class="discovery-pipeline__arrow"
          aria-hidden="true"
        >
          →
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.discovery-pipeline__title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.discovery-pipeline__intro {
  margin: 0 0 1.25rem;
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.discovery-pipeline__track {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.discovery-pipeline__node {
  flex: 1;
  min-width: 7.5rem;
  padding: 0.75rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: #f8fafc;
  text-align: center;
}

.discovery-pipeline__node--active {
  border-color: var(--color-primary);
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.discovery-pipeline__node--done {
  border-color: #86efac;
  background: #f0fdf4;
}

.discovery-pipeline__node--error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.discovery-pipeline__node-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
}

.discovery-pipeline__node-hint {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: var(--color-muted);
}

.discovery-pipeline__arrow {
  align-self: center;
  color: #94a3b8;
  font-size: 1rem;
  flex-shrink: 0;
}
</style>
