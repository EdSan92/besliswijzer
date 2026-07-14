<script setup lang="ts">
const { register } = useRevealOnScroll()

const points = [
  {
    title: 'Afgestemd op jouw situatie',
    description: 'Geen standaard best-of lijst. Jouw antwoorden bepalen welke producten in aanmerking komen.',
  },
  {
    title: 'Transparante uitleg',
    description: 'Elk advies komt met redenen. Je ziet precies waarom Veraio dit product aanbeveelt.',
  },
  {
    title: 'Onafhankelijk advies',
    description: 'Veraio verkoopt geen producten. Jij houdt de regie over waar en wanneer je koopt.',
  },
]

const sources = [
  'Jouw antwoorden over situatie, budget en wensen',
  'Productspecificaties en expertcriteria',
  'Onafhankelijke bronnen — geen verkopers',
]
</script>

<template>
  <section id="waarom" class="landing-why">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal landing-why__grid"
      >
        <div class="landing-why__intro">
          <p class="landing-eyebrow">Vertrouwen</p>
          <h2 class="landing-heading">
            Advies dat je kunt volgen — en uitleggen
          </h2>
          <p class="landing-body">
            Veraio is gebouwd voor mensen die zekerheid willen bij een aankoop.
            Geen mysterie, geen verborgen agenda.
          </p>

          <div class="landing-why__sources">
            <p class="landing-why__sources-title">Waarop baseren we adviezen?</p>
            <ul class="landing-why__sources-list">
              <li v-for="source in sources" :key="source">{{ source }}</li>
            </ul>
          </div>
        </div>

        <ul class="landing-why__list">
          <li
            v-for="(point, index) in points"
            :key="point.title"
            :ref="(el) => register(el)"
            class="landing-reveal landing-why__item"
            :style="{ transitionDelay: `${index * 0.05}s` }"
          >
            <span class="landing-why__icon" aria-hidden="true">✓</span>
            <div>
              <h3 class="landing-why__title">{{ point.title }}</h3>
              <p class="landing-why__desc">{{ point.description }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-why {
  padding: 5.5rem 0;
  border-top: 1px solid var(--veraio-border);
  background: var(--veraio-surface-muted);
}

.landing-why__grid {
  display: grid;
  gap: 3rem;
}

.landing-why__intro .landing-body {
  margin-top: 1rem;
  max-width: 440px;
}

.landing-why__sources {
  margin-top: 1.75rem;
  padding: 1.25rem 1.375rem;
  background: var(--veraio-surface);
  border-radius: var(--veraio-radius);
  border: 1px solid rgba(31, 107, 92, 0.12);
}

.landing-why__sources-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--veraio-primary);
  margin: 0 0 0.625rem;
}

.landing-why__sources-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.375rem;
}

.landing-why__sources-list li {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  padding-left: 1rem;
  position: relative;
  line-height: 1.45;
}

.landing-why__sources-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--veraio-gold);
}

.landing-why__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
}

.landing-why__item {
  display: grid;
  grid-template-columns: 2.25rem 1fr;
  gap: 1rem;
  align-items: start;
  padding: 1.25rem;
  background: var(--veraio-surface);
  border-radius: var(--veraio-radius);
  border: 1px solid var(--veraio-border);
}

.landing-why__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--veraio-primary-soft);
  color: var(--veraio-primary);
  font-size: 0.875rem;
  font-weight: 700;
}

.landing-why__title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
  color: var(--veraio-text);
}

.landing-why__desc {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.6;
  margin: 0;
}

@media (min-width: 900px) {
  .landing-why__grid {
    grid-template-columns: 1fr 1fr;
    gap: 5rem;
    align-items: start;
  }
}
</style>
