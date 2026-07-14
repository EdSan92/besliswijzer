<script setup lang="ts">
const { register } = useRevealOnScroll()

const pains = [
  {
    title: 'Te veel opties',
    description: 'Honderden producten, elk met andere specificaties. Waar begin je?',
  },
  {
    title: 'Onvergelijkbare info',
    description: 'Fabrikanten benadrukken wat hen uitkomt. Jij moet zelf filteren wat relevant is.',
  },
  {
    title: 'Twijfel achteraf',
    description: 'Zelfs na uren research blijf je je afvragen: had ik de juiste gekozen?',
  },
]
</script>

<template>
  <section class="landing-problem">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal landing-problem__header"
      >
        <p class="landing-eyebrow">Het probleem</p>
        <h2 class="landing-heading">Een verkeerde aankoop voorkomen begint hier</h2>
        <p class="landing-subheading">
          De meeste mensen willen geen productexpert worden. Ze willen weten:
          koop ik het juiste product — voor míjn situatie?
        </p>
      </div>

      <ul class="landing-problem__list">
        <li
          v-for="(pain, index) in pains"
          :key="pain.title"
          :ref="(el) => register(el)"
          class="landing-reveal landing-problem__item"
          :style="{ transitionDelay: `${index * 0.06}s` }"
        >
          <h3 class="landing-problem__title">{{ pain.title }}</h3>
          <p class="landing-problem__desc">{{ pain.description }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.landing-problem {
  padding: 5.5rem 0;
  background: var(--veraio-bg);
}

.landing-problem__header {
  margin-bottom: 3rem;
  max-width: 560px;
}

.landing-problem__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0;
  border-top: 1px solid var(--veraio-border);
}

.landing-problem__item {
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--veraio-border);
}

.landing-problem__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.375rem;
  color: var(--veraio-text);
}

.landing-problem__desc {
  font-size: 0.9375rem;
  color: var(--veraio-muted);
  line-height: 1.6;
  margin: 0;
  max-width: 480px;
}

@media (min-width: 768px) {
  .landing-problem__list {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    border-top: none;
  }

  .landing-problem__item {
    border-bottom: none;
    padding: 0;
    padding-top: 1.25rem;
    border-top: 2px solid var(--veraio-gold);
  }
}
</style>
