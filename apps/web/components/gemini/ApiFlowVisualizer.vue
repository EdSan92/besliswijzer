<script setup lang="ts">
import type { ApiFlowStep } from '~/types/gemini'

const props = withDefaults(
  defineProps<{
    steps: ApiFlowStep[]
    loading?: boolean
    title?: string
  }>(),
  { title: 'API Flow' },
)

const statusIcon: Record<ApiFlowStep['status'], string> = {
  pending: '○',
  active: '◉',
  done: '✓',
  error: '✕',
}
</script>

<template>
  <div class="flow-viz">
    <h2 class="flow-viz__title">{{ title }}</h2>

    <div v-if="!steps.length && !loading" class="flow-viz__empty">
      <slot name="empty">Stuur een bericht om de API-flow te zien.</slot>
    </div>

    <ol v-else class="flow-viz__steps">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="flow-viz__step"
        :class="`flow-viz__step--${step.status}`"
      >
        <div class="flow-viz__marker">
          <span class="flow-viz__icon">{{ statusIcon[step.status] }}</span>
          <span v-if="index < steps.length - 1" class="flow-viz__connector" />
        </div>

        <div class="flow-viz__content">
          <div class="flow-viz__label-row">
            <strong>{{ step.label }}</strong>
            <span v-if="step.durationMs != null" class="flow-viz__duration">{{ step.durationMs }}ms</span>
          </div>
          <p v-if="step.detail" class="flow-viz__detail">{{ step.detail }}</p>
          <time class="flow-viz__time">{{ new Date(step.timestamp).toLocaleTimeString('nl-NL') }}</time>
        </div>
      </li>

      <li v-if="loading" class="flow-viz__step flow-viz__step--active">
        <div class="flow-viz__marker">
          <span class="flow-viz__icon flow-viz__icon--pulse">◉</span>
        </div>
        <div class="flow-viz__content">
          <strong>Wachten op antwoord…</strong>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.flow-viz {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.flow-viz__title {
  margin: 0 0 1.25rem;
  font-size: 1.1rem;
}

.flow-viz__empty {
  color: var(--color-muted);
  font-size: 0.95rem;
}

.flow-viz__steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.flow-viz__step {
  display: flex;
  gap: 1rem;
  position: relative;
}

.flow-viz__step + .flow-viz__step {
  margin-top: 0.25rem;
}

.flow-viz__marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 1.5rem;
  flex-shrink: 0;
}

.flow-viz__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  background: #f1f5f9;
  color: var(--color-muted);
}

.flow-viz__step--active .flow-viz__icon {
  background: #dbeafe;
  color: var(--color-primary);
}

.flow-viz__step--done .flow-viz__icon {
  background: #dcfce7;
  color: var(--color-success);
}

.flow-viz__step--error .flow-viz__icon {
  background: #fee2e2;
  color: #dc2626;
}

.flow-viz__icon--pulse {
  animation: pulse 1.2s ease-in-out infinite;
}

.flow-viz__connector {
  flex: 1;
  width: 2px;
  min-height: 1.5rem;
  background: var(--color-border);
  margin: 0.25rem 0;
}

.flow-viz__content {
  flex: 1;
  padding-bottom: 1.25rem;
}

.flow-viz__label-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flow-viz__duration {
  font-size: 0.8rem;
  color: var(--color-muted);
  background: #f1f5f9;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}

.flow-viz__detail {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--color-muted);
  word-break: break-word;
}

.flow-viz__time {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
