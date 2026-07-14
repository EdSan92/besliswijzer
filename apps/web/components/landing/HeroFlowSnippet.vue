<script setup lang="ts">
defineProps<{
  flowSlug?: string
}>()
</script>

<template>
  <div class="flow-snippet">
    <p class="flow-snippet__label">Robotmaaier keuzehulp</p>
    <h2 class="flow-snippet__question">Hoe groot is je tuin?</h2>
    <p class="flow-snippet__hint">Schat het maaibare oppervlak — voortuin en achtertuin meegeteld.</p>

    <ul class="flow-snippet__options" role="list">
      <li>Kleiner dan 200 m²</li>
      <li>200 – 500 m²</li>
      <li>Groter dan 500 m²</li>
    </ul>

    <div class="flow-snippet__progress" aria-hidden="true">
      <div class="flow-snippet__progress-fill" />
    </div>
    <p class="flow-snippet__step">Vraag 1 van 5</p>

    <NuxtLink :to="`/flows/${flowSlug ?? 'robotmaaiers'}`" class="flow-snippet__cta">
      Ga verder met deze keuzehulp →
    </NuxtLink>
  </div>
</template>

<style scoped>
.flow-snippet {
  padding: 2rem 2rem 1.75rem;
  background: var(--veraio-bg);
  border: 1px solid var(--veraio-border);
  border-radius: var(--veraio-radius-lg);
}

.flow-snippet__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--veraio-muted);
  margin: 0 0 1.25rem;
}

.flow-snippet__question {
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 0 0 0.5rem;
}

.flow-snippet__hint {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

.flow-snippet__options {
  list-style: none;
  margin: 0 0 1.75rem;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.flow-snippet__options li {
  padding: 0.875rem 1rem;
  font-size: 0.9375rem;
  border: 1px solid var(--veraio-border);
  border-radius: var(--veraio-radius);
  background: var(--veraio-surface);
}

.flow-snippet__options li:first-child {
  border-color: var(--veraio-text);
  background: var(--veraio-bg);
  font-weight: 500;
}

.flow-snippet__progress {
  height: 2px;
  background: var(--veraio-border);
  margin-bottom: 0.625rem;
}

.flow-snippet__progress-fill {
  width: 20%;
  height: 100%;
  background: var(--veraio-text);
}

.flow-snippet__step {
  font-size: 0.75rem;
  color: var(--veraio-muted);
  margin: 0 0 1.25rem;
}

.flow-snippet__cta {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--veraio-text);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: rgba(0, 0, 0, 0.25);
}

.flow-snippet__cta:hover {
  text-decoration-color: rgba(0, 0, 0, 0.6);
}
</style>
