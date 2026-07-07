<script setup lang="ts">
const { register } = useRevealOnScroll()

const stats = [
  { value: '12.000+', label: 'Adviezen gegeven' },
  { value: '2 min', label: 'Gemiddelde doorlooptijd' },
  { value: '100%', label: 'Gratis & onafhankelijk' },
]
</script>

<template>
  <div
    :ref="(el) => register(el as Element)"
    class="landing-reveal landing-trust"
  >
    <div class="landing-container landing-trust__inner">
      <div v-for="stat in stats" :key="stat.label" class="landing-trust__stat">
        <strong class="landing-trust__value">{{ stat.value }}</strong>
        <span class="landing-trust__label">{{ stat.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-trust {
  border-top: 1px solid var(--veraio-border);
  border-bottom: 1px solid var(--veraio-border);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
}

.landing-trust__inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
}

.landing-trust__stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.landing-trust__value {
  font-size: clamp(1.25rem, 2.5vw, 1.625rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  background: var(--veraio-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.landing-trust__label {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
}

@media (max-width: 540px) {
  .landing-trust__inner {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
}
</style>
