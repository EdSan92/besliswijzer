<script setup lang="ts">
const { register } = useRevealOnScroll()

const reasons = [
  {
    title: 'Gebaseerd op jouw situatie',
    description: 'Geen generieke top-10 lijstjes. Elke aanbeveling is afgestemd op wat jij invult.',
    icon: 'user',
  },
  {
    title: 'Onafhankelijk en transparant',
    description: 'We leggen uit waarom een product past — zodat jij met vertrouwen kiest.',
    icon: 'shield',
  },
  {
    title: 'Snel en eenvoudig',
    description: 'Binnen enkele minuten klaar. Geen account, geen nieuwsbrieven, geen gedoe.',
    icon: 'zap',
  },
  {
    title: 'Altijd actueel',
    description: 'Keuzehulpen worden continu bijgewerkt met de nieuwste producten en inzichten.',
    icon: 'refresh',
  },
]
</script>

<template>
  <section id="waarom" class="landing-section">
    <div class="landing-container landing-why__layout">
      <div
        :ref="(el) => register(el as Element)"
        class="landing-reveal landing-why__header"
      >
        <span class="landing-label">Waarom Veraio</span>
        <h2 class="landing-heading">
          Keuzes maken hoeft niet <span class="landing-gradient-text">moeilijk</span> te zijn
        </h2>
        <p class="landing-subheading">
          Veraio combineert expertise met een eenvoudige ervaring — zodat jij sneller de juiste beslissing neemt.
        </p>

        <div class="landing-why__highlight" aria-hidden="true">
          <span class="landing-why__highlight-value">4.9</span>
          <div>
            <span class="landing-why__highlight-stars">★★★★★</span>
            <span class="landing-why__highlight-label">Gemiddelde beoordeling</span>
          </div>
        </div>
      </div>

      <div class="landing-why__grid">
        <article
          v-for="(reason, index) in reasons"
          :key="reason.title"
          :ref="(el) => register(el as Element)"
          class="landing-reveal landing-why__item"
          :style="{ transitionDelay: `${index * 0.08}s` }"
        >
          <div class="landing-why__icon" aria-hidden="true">
            <svg v-if="reason.icon === 'user'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="reason.icon === 'shield'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l6 2.5V10c0 3.5-2.5 5.5-6 7-3.5-1.5-6-3.5-6-7V4.5L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M7.5 10l2 2 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="reason.icon === 'zap'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11 2L5 11h5l-1 7 7-10h-5l1-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 10a6 6 0 11-2.2-4.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M16 4v3h-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="landing-why__title">{{ reason.title }}</h3>
          <p class="landing-why__desc">{{ reason.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-why__layout {
  background:
    radial-gradient(ellipse 50% 40% at 0% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 60%);
}

.landing-why__header {
  position: relative;
}

.landing-why__highlight {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2.5rem;
  padding: 1rem 1.5rem;
  border-radius: var(--veraio-radius);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--veraio-border);
  box-shadow: var(--veraio-shadow-sm);
}

.landing-why__highlight-value {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.04em;
  background: var(--veraio-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.landing-why__highlight-stars {
  display: block;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  color: #f59e0b;
  margin-bottom: 0.125rem;
}

.landing-why__highlight-label {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
}

.landing-why__grid {
  display: grid;
  gap: 1.25rem;
}

.landing-why__item {
  padding: 1.75rem;
  border-radius: var(--veraio-radius);
  border: 1px solid transparent;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.landing-why__item:hover {
  border-color: var(--veraio-border);
  background: rgba(255, 255, 255, 0.7);
}

.landing-why__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--veraio-accent-soft);
  color: var(--veraio-accent);
  margin-bottom: 1rem;
  border: 1px solid rgba(99, 102, 241, 0.12);
}

.landing-why__title {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 0.5rem;
}

.landing-why__desc {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.65;
  margin: 0;
}

@media (min-width: 768px) {
  .landing-why__layout {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    align-items: start;
    gap: 4rem;
  }

  .landing-why__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem 1.5rem;
  }
}
</style>
