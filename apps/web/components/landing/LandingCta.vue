<script setup lang="ts">
defineProps<{
  ctaHref: string
}>()

const { register } = useRevealOnScroll()
</script>

<template>
  <section id="start" class="landing-cta">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal landing-cta__panel"
      >
        <span class="landing-badge">Gratis · Geen account</span>
        <h2 class="landing-heading">Stop met twijfelen. Start met zekerheid.</h2>
        <p class="landing-body landing-cta__text">
          Vertel Veraio wat je nodig hebt en ontvang één aanbeveling
          met uitleg — in ongeveer 2 minuten.
        </p>
        <NuxtLink :to="ctaHref" class="landing-btn landing-btn--large landing-cta__btn">
          Ontvang jouw advies
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-cta {
  padding: 3rem 0 6rem;
  background: var(--veraio-bg);
}

.landing-cta__panel {
  text-align: center;
  max-width: 560px;
  margin: 0 auto;
  padding: 3rem 2rem;
  background: linear-gradient(145deg, rgba(31, 107, 92, 0.06) 0%, rgba(217, 164, 65, 0.05) 100%);
  border: 1px solid rgba(31, 107, 92, 0.15);
  border-radius: var(--veraio-radius-lg);
  box-shadow: var(--veraio-shadow);
}

.landing-cta__panel .landing-badge {
  margin-bottom: 1.25rem;
}

.landing-cta__text {
  margin: 0 auto 1.75rem;
  max-width: 420px;
}

.landing-cta__btn {
  min-width: 220px;
}
</style>
