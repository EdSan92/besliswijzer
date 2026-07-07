<script setup lang="ts">
import type { PopularFlowItem } from '@besliswijzer/flow-schema'

const props = defineProps<{
  flows: PopularFlowItem[]
}>()

const { register } = useRevealOnScroll()

const categoryColors: Record<string, string> = {
  'Tuin & buiten': '#22c55e',
  'Energie & wonen': '#f59e0b',
  Mobiliteit: '#3b82f6',
  Keuzehulp: '#6366f1',
}

const displayFlows = computed(() => props.flows.slice(0, 6))

function categoryColor(category: string) {
  return categoryColors[category] ?? '#6366f1'
}
</script>

<template>
  <section id="populair" class="landing-popular">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal landing-popular__header"
      >
        <span class="landing-label">Direct starten</span>
        <h2 class="landing-heading">Populairste keuzehulpen</h2>
        <p class="landing-subheading">
          Kies een keuzehulp en ontvang meteen een persoonlijk advies.
        </p>
      </div>

      <div v-if="displayFlows.length" class="landing-popular__grid">
        <div
          v-for="(flow, index) in displayFlows"
          :key="flow.id"
          :ref="(el) => register(el)"
          class="landing-reveal landing-popular__item"
          :style="{ transitionDelay: `${index * 0.06}s` }"
        >
          <NuxtLink :to="`/flows/${flow.slug}`" class="landing-popular__card">
            <span v-if="index === 0 && flow.starts > 0" class="landing-popular__badge">
              Meest populair
            </span>

            <span
              class="landing-popular__dot"
              :style="{ background: categoryColor(flow.category) }"
              aria-hidden="true"
            />

            <span class="landing-popular__category">{{ flow.category }}</span>
            <span class="landing-popular__title">{{ flow.title }}</span>

            <span class="landing-popular__footer">
              <span class="landing-popular__cta">Start keuzehulp</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </NuxtLink>
        </div>
      </div>

      <p v-else class="landing-popular__empty">
        Er zijn nog geen keuzehulpen beschikbaar.
      </p>

      <p
        v-if="displayFlows.length"
        :ref="(el) => register(el)"
        class="landing-reveal landing-popular__more"
      >
        <a href="#voorbeelden">Bekijk alle keuzehulpen →</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.landing-popular {
  padding: 3rem 0 4rem;
  border-bottom: 1px solid var(--veraio-border);
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99, 102, 241, 0.05) 0%, transparent 60%),
    var(--veraio-bg);
}

.landing-popular__header {
  margin-bottom: 2.5rem;
}

.landing-popular__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.landing-popular__item {
  min-width: 0;
}

.landing-popular__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  height: 100%;
  padding: 1.5rem 1.625rem;
  border-radius: var(--veraio-radius);
  border: 1px solid var(--veraio-border);
  background: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  color: inherit;
  box-shadow: var(--veraio-shadow-sm);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}

.landing-popular__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, transparent 55%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.landing-popular__card:hover {
  border-color: rgba(99, 102, 241, 0.25);
  box-shadow: var(--veraio-shadow-md);
  transform: translateY(-2px);
}

.landing-popular__card:hover::before {
  opacity: 1;
}

.landing-popular__badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--veraio-accent);
  padding: 0.3rem 0.625rem;
  border-radius: 999px;
  background: var(--veraio-accent-soft);
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.landing-popular__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-bottom: 0.35rem;
}

.landing-popular__category {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--veraio-muted);
}

.landing-popular__title {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  padding-right: 5rem;
}

.landing-popular__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--veraio-border);
}

.landing-popular__cta {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--veraio-accent);
}

.landing-popular__card:hover .landing-popular__footer svg {
  transform: translateX(3px);
  color: var(--veraio-accent);
}

.landing-popular__footer svg {
  color: var(--veraio-muted);
  transition: transform 0.25s ease, color 0.25s ease;
}

.landing-popular__empty {
  margin: 0;
  padding: 2rem;
  text-align: center;
  color: var(--veraio-muted);
  border: 1px dashed var(--veraio-border);
  border-radius: var(--veraio-radius);
}

.landing-popular__more {
  margin: 2rem 0 0;
  text-align: center;
  font-size: 0.9375rem;
}

.landing-popular__more a {
  color: var(--veraio-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.landing-popular__more a:hover {
  color: var(--veraio-accent);
}

@media (min-width: 960px) {
  .landing-popular__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
