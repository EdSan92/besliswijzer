<script setup lang="ts">
const { register } = useRevealOnScroll()

const steps = [
  {
    title: 'Vertel jouw situatie',
    description: 'Een paar gerichte vragen over wat je nodig hebt, je budget en je omgeving.',
  },
  {
    title: 'Veraio zoekt de beste match',
    description: 'Wij doorzoeken specificaties, reviews en criteria — afgestemd op wat jij invult.',
  },
  {
    title: 'Ontvang één duidelijk advies',
    description: 'Eén aanbeveling met matchscore en uitleg waarom dit product past bij jou.',
  },
]
</script>

<template>
  <section id="hoe-het-werkt" class="landing-how">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal landing-how__header"
      >
        <p class="landing-eyebrow">Hoe Veraio het oplost</p>
        <h2 class="landing-heading">Van twijfel naar zekerheid</h2>
        <p class="landing-subheading">
          Veraio neemt het uitzoekwerk over, zodat jij met vertrouwen kiest.
        </p>
      </div>

      <ol class="landing-how__steps">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          :ref="(el) => register(el)"
          class="landing-reveal landing-how__step"
          :style="{ transitionDelay: `${index * 0.06}s` }"
        >
          <span class="landing-how__num">{{ index + 1 }}</span>
          <div>
            <h3 class="landing-how__title">{{ step.title }}</h3>
            <p class="landing-how__desc">{{ step.description }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.landing-how {
  padding: 5.5rem 0;
  background: var(--veraio-surface);
}

.landing-how__header {
  margin-bottom: 3rem;
  max-width: 560px;
}

.landing-how__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  max-width: 680px;
}

.landing-how__step {
  display: grid;
  grid-template-columns: 2.75rem 1fr;
  gap: 1.25rem;
  padding: 1.5rem;
  background: var(--veraio-bg);
  border: 1px solid var(--veraio-border);
  border-radius: var(--veraio-radius);
}

.landing-how__num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  background: var(--veraio-primary);
  border-radius: 50%;
}

.landing-how__title {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 0.375rem;
  color: var(--veraio-text);
}

.landing-how__desc {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.6;
  margin: 0;
}
</style>
