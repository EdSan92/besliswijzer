<script setup lang="ts">
import type { PopularFlowItem } from '@besliswijzer/flow-schema'

type FlowItem = { id: string; slug: string; title: string }
type CategoryItem = {
  id: string
  slug: string
  title: string
  description: string | null
  flows: FlowItem[]
}

const props = defineProps<{
  popularFlows: PopularFlowItem[]
  categories: CategoryItem[]
  uncategorized: FlowItem[]
}>()

const { register } = useRevealOnScroll()

const categoryColors: Record<string, string> = {
  'Tuin & buiten': '#22c55e',
  'Energie & wonen': '#f59e0b',
  Mobiliteit: '#3b82f6',
  Keuzehulp: '#6366f1',
}

const fallbackExamples = [
  { slug: 'robotmaaiers', title: 'Robotmaaier keuzehulp', category: 'Tuin & buiten', duration: '2 min' },
  { slug: 'warmtepomp', title: 'Warmtepomp advies', category: 'Energie & wonen', duration: '3 min' },
  { slug: 'elektrische-auto', title: 'Elektrische auto keuze', category: 'Mobiliteit', duration: '4 min' },
]

const examples = computed(() => {
  if (props.popularFlows.length > 0) {
    return props.popularFlows.map((flow) => ({
      slug: flow.slug,
      title: flow.title,
      category: flow.category,
      duration: '2 min',
    }))
  }

  const fromApi: { slug: string; title: string; category: string; duration: string }[] = []

  for (const category of props.categories) {
    for (const flow of category.flows.slice(0, 2)) {
      fromApi.push({ slug: flow.slug, title: flow.title, category: category.title, duration: '2 min' })
    }
  }

  for (const flow of props.uncategorized.slice(0, 2)) {
    fromApi.push({ slug: flow.slug, title: flow.title, category: 'Keuzehulp', duration: '2 min' })
  }

  return fromApi.length > 0 ? fromApi.slice(0, 6) : fallbackExamples
})

function categoryColor(category: string) {
  return categoryColors[category] ?? '#6366f1'
}
</script>

<template>
  <section id="voorbeelden" class="landing-section landing-examples">
    <div class="landing-dot-grid landing-examples__grid-bg" aria-hidden="true" />

    <div class="landing-container">
      <div
        :ref="(el) => register(el as Element)"
        class="landing-reveal landing-examples__header"
      >
        <span class="landing-label">Alle keuzehulpen</span>
        <h2 class="landing-heading">Meer keuzehulpen ontdekken</h2>
        <p class="landing-subheading">
          Van tuin tot energie — ontdek hoe Veraio je helpt de juiste keuze te maken.
        </p>
      </div>

      <ul class="landing-examples__list">
        <li
          v-for="(example, index) in examples"
          :key="example.slug"
          :ref="(el) => register(el as Element)"
          class="landing-reveal"
          :style="{ transitionDelay: `${index * 0.08}s` }"
        >
          <NuxtLink :to="`/flows/${example.slug}`" class="landing-examples__item">
            <span
              class="landing-examples__dot"
              :style="{ background: categoryColor(example.category) }"
              aria-hidden="true"
            />
            <div class="landing-examples__content">
              <span class="landing-examples__category">{{ example.category }}</span>
              <span class="landing-examples__title">{{ example.title }}</span>
            </div>
            <span class="landing-examples__meta">
              <span class="landing-examples__duration">{{ example.duration }}</span>
              <svg class="landing-examples__arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.landing-examples {
  position: relative;
  background: var(--veraio-surface);
  border-top: 1px solid var(--veraio-border);
  border-bottom: 1px solid var(--veraio-border);
  overflow: hidden;
}

.landing-examples__grid-bg {
  opacity: 0.5;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 10%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 10%, transparent 70%);
}

.landing-examples__header {
  position: relative;
  margin-bottom: 3.5rem;
}

.landing-examples__list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--veraio-radius-lg);
  border: 1px solid var(--veraio-border);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: var(--veraio-shadow-sm);
}

.landing-examples__item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid var(--veraio-border);
  text-decoration: none;
  color: inherit;
  transition: background 0.25s ease, padding-left 0.25s ease;
}

.landing-examples__item:last-child {
  border-bottom: none;
}

.landing-examples__item:hover {
  background: rgba(99, 102, 241, 0.03);
  padding-left: 2rem;
}

.landing-examples__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
}

.landing-examples__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.landing-examples__category {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--veraio-muted);
}

.landing-examples__title {
  font-size: clamp(1.0625rem, 2vw, 1.25rem);
  font-weight: 500;
  letter-spacing: -0.02em;
}

.landing-examples__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.landing-examples__duration {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  white-space: nowrap;
}

.landing-examples__arrow {
  color: var(--veraio-muted);
  transition: transform 0.25s ease, color 0.25s ease;
}

.landing-examples__item:hover .landing-examples__arrow {
  transform: translateX(4px);
  color: var(--veraio-accent);
}

@media (max-width: 540px) {
  .landing-examples__duration {
    display: none;
  }
}
</style>
