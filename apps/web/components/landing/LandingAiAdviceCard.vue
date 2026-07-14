<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    category?: string
    situation?: string[]
    productName?: string
    matchPercent?: number
    verdict?: string
    reasons?: string[]
    basedOn?: string[]
    compact?: boolean
    showCta?: boolean
    ctaHref?: string
  }>(),
  {
    category: 'Robotmaaier',
    situation: () => ['350 m² tuin', 'Lichte helling', 'Weinig onderhoud'],
    productName: 'Worx Landroid Vision',
    matchPercent: 94,
    verdict: 'Past uitstekend bij jouw tuin',
    reasons: () => [
      'Dekking voor 350 m² zonder extra zone',
      'Hanteert lichte hellingen betrouwbaar',
      'Weinig onderhoud dankzij vision-navigatie',
    ],
    basedOn: () => ['Tuinoppervlak', 'Helling', 'Onderhoudswensen', 'Budget'],
    compact: false,
    showCta: false,
    ctaHref: '/flows/robotmaaiers',
  },
)

const gradientId = `matchGradient-${useId()}`

const RING_RADIUS = 34
const circumference = 2 * Math.PI * RING_RADIUS

const ringOffset = computed(
  () => circumference - (circumference * props.matchPercent) / 100,
)
</script>

<template>
  <article class="advice-card" :class="{ 'advice-card--compact': compact }">
    <div class="advice-card__glow" aria-hidden="true" />

    <header class="advice-card__top">
      <span class="advice-card__label">Jouw aanbeveling</span>
      <span class="advice-card__category">{{ category }}</span>
    </header>

    <section class="advice-card__hero">
      <div class="advice-card__hero-text">
        <p class="advice-card__verdict">{{ verdict }}</p>
        <h3 class="advice-card__product">{{ productName }}</h3>
      </div>

      <div class="advice-card__score" :aria-label="`${matchPercent} procent match`">
        <svg class="advice-card__ring" viewBox="0 0 80 80" aria-hidden="true">
          <defs>
            <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1F6B5C" />
              <stop offset="100%" stop-color="#D9A441" />
            </linearGradient>
          </defs>
          <circle
            class="advice-card__ring-track"
            cx="40"
            cy="40"
            :r="RING_RADIUS"
            fill="none"
          />
          <circle
            class="advice-card__ring-fill"
            cx="40"
            cy="40"
            :r="RING_RADIUS"
            fill="none"
            :stroke="`url(#${gradientId})`"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <div class="advice-card__score-inner">
          <span class="advice-card__score-value">{{ matchPercent }}%</span>
          <span class="advice-card__score-label">match</span>
        </div>
      </div>
    </section>

    <section class="advice-card__situation">
      <p class="advice-card__section-label">Op basis van jouw situatie</p>
      <ul class="advice-card__chips">
        <li v-for="item in situation" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section v-if="!compact" class="advice-card__reasons">
      <p class="advice-card__section-label">Waarom dit product?</p>
      <ul class="advice-card__reason-list">
        <li v-for="reason in reasons" :key="reason">{{ reason }}</li>
      </ul>
    </section>

    <section v-else-if="reasons.length" class="advice-card__teaser">
      <p>{{ reasons.length }} concrete redenen — ontdek ze in jouw advies</p>
    </section>

    <footer v-if="basedOn.length" class="advice-card__footnote">
      <p class="advice-card__footnote-label">Advies gebaseerd op</p>
      <ul class="advice-card__footnote-tags">
        <li v-for="item in basedOn" :key="item">{{ item }}</li>
      </ul>
    </footer>

    <NuxtLink
      v-if="showCta"
      :to="ctaHref"
      class="advice-card__cta"
    >
      Ontvang jouw advies
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </NuxtLink>
  </article>
</template>

<style scoped>
.advice-card {
  position: relative;
  background: var(--veraio-surface);
  border: 1px solid rgba(31, 107, 92, 0.12);
  border-radius: var(--veraio-radius-lg);
  box-shadow: var(--veraio-shadow-glow);
  padding: 1.75rem;
  overflow: hidden;
}

.advice-card__glow {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 60%;
  height: 60%;
  background: radial-gradient(circle, var(--veraio-gold-muted) 0%, transparent 70%);
  pointer-events: none;
}

.advice-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  position: relative;
}

.advice-card__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--veraio-primary);
}

.advice-card__category {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--veraio-muted);
  padding: 0.25rem 0.625rem;
  background: var(--veraio-surface-muted);
  border-radius: 999px;
}

.advice-card__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, var(--veraio-primary-muted) 0%, var(--veraio-gold-muted) 100%);
  border-radius: var(--veraio-radius);
  border: 1px solid rgba(31, 107, 92, 0.08);
  position: relative;
}

.advice-card__verdict {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--veraio-primary);
  margin: 0 0 0.375rem;
}

.advice-card__product {
  font-size: clamp(1.125rem, 2.5vw, 1.375rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin: 0;
  color: var(--veraio-text);
}

.advice-card__score {
  position: relative;
  flex-shrink: 0;
  width: 5rem;
  height: 5rem;
}

.advice-card__ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.advice-card__ring-track {
  stroke: rgba(31, 107, 92, 0.12);
  stroke-width: 5;
}

.advice-card__ring-fill {
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.advice-card__score-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.advice-card__score-value {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--veraio-primary);
}

.advice-card__score-label {
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--veraio-muted);
  margin-top: 0.125rem;
}

.advice-card__section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--veraio-muted);
  margin: 0 0 0.625rem;
}

.advice-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.advice-card__chips li {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--veraio-text);
  padding: 0.375rem 0.75rem;
  background: var(--veraio-surface-muted);
  border-radius: 999px;
  border: 1px solid var(--veraio-border);
}

.advice-card__situation {
  margin-bottom: 1.25rem;
  position: relative;
}

.advice-card__reasons {
  margin-bottom: 1.25rem;
  position: relative;
}

.advice-card__reason-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.advice-card__reason-list li {
  font-size: 0.875rem;
  color: var(--veraio-text);
  padding-left: 1.125rem;
  position: relative;
  line-height: 1.45;
}

.advice-card__reason-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--veraio-gold);
}

.advice-card__teaser {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--veraio-gold-soft);
  border-radius: var(--veraio-radius);
  position: relative;
}

.advice-card__teaser p {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #7a5a18;
}

.advice-card__footnote {
  padding-top: 1.125rem;
  border-top: 1px solid var(--veraio-border);
  position: relative;
}

.advice-card__footnote-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--veraio-muted);
  margin: 0 0 0.5rem;
}

.advice-card__footnote-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.advice-card__footnote-tags li {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--veraio-muted);
  padding: 0.2rem 0.5rem;
  border: 1px dashed rgba(31, 107, 92, 0.2);
  border-radius: 4px;
}

.advice-card__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 1.25rem;
  padding: 0.875rem 1.25rem;
  background: var(--veraio-primary);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--veraio-radius);
  transition: background 0.15s ease;
  position: relative;
}

.advice-card__cta:hover {
  background: var(--veraio-primary-hover);
  color: white;
}

.advice-card--compact .advice-card__hero {
  padding: 1rem;
}

.advice-card--compact .advice-card__score {
  width: 4.5rem;
  height: 4.5rem;
}

.advice-card--compact .advice-card__score-value {
  font-size: 1rem;
}

.advice-card--compact .advice-card__footnote {
  padding-top: 0.875rem;
}

@media (prefers-reduced-motion: reduce) {
  .advice-card__ring-fill {
    transition: none;
  }
}
</style>
