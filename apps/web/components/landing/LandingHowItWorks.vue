<script setup lang="ts">
const { register } = useRevealOnScroll()

const steps = [
  {
    number: '01',
    title: 'Beantwoord vragen',
    description: 'Vertel ons over jouw situatie, wensen en budget. Geen ingewikkelde formulieren — alleen wat echt telt.',
    icon: 'chat',
  },
  {
    number: '02',
    title: 'Slimme analyse',
    description: 'Onze keuzehulp vergelijkt duizenden combinaties en weegt factoren die jij zelf misschien over het hoofd ziet.',
    icon: 'spark',
  },
  {
    number: '03',
    title: 'Persoonlijk advies',
    description: 'Ontvang een duidelijke aanbeveling met uitleg waarom dit product het beste bij jou past.',
    icon: 'target',
  },
]
</script>

<template>
  <section id="hoe-het-werkt" class="landing-section landing-how">
    <div class="landing-container">
      <div
        :ref="(el) => register(el as Element)"
        class="landing-reveal landing-how__header"
      >
        <span class="landing-label">Hoe het werkt</span>
        <h2 class="landing-heading">Van vraag naar advies in drie stappen</h2>
        <p class="landing-subheading">
          Geen eindeloos vergelijken. Veraio helpt je snel naar de juiste keuze.
        </p>
      </div>

      <div class="landing-how__track" aria-hidden="true">
        <div class="landing-how__track-line" />
      </div>

      <div class="landing-how__steps">
        <article
          v-for="(step, index) in steps"
          :key="step.number"
          :ref="(el) => register(el as Element)"
          class="landing-reveal landing-how__step"
          :style="{ transitionDelay: `${index * 0.1}s` }"
        >
          <div class="landing-how__icon-wrap">
            <svg v-if="step.icon === 'chat'" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M4 6a3 3 0 013-3h8a3 3 0 013 3v5a3 3 0 01-3 3H9l-4 3v-3H7a3 3 0 01-3-3V6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M8 9h6M8 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="step.icon === 'spark'" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M11 2l1.2 4.8L17 8l-4.8 1.2L11 14l-1.2-4.8L5 8l4.8-1.2L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M17 14l.6 2.4L20 17l-2.4.6L17 20l-.6-2.4L14 17l2.4-.6L17 14z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="11" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>

          <span class="landing-how__number">{{ step.number }}</span>
          <h3 class="landing-how__title">{{ step.title }}</h3>
          <p class="landing-how__desc">{{ step.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-how {
  background:
    radial-gradient(ellipse 60% 40% at 50% 100%, rgba(99, 102, 241, 0.04) 0%, transparent 60%);
}

.landing-how__header {
  margin-bottom: 4rem;
}

.landing-how__track {
  display: none;
}

.landing-how__steps {
  display: grid;
  gap: 2rem;
  position: relative;
}

.landing-how__step {
  position: relative;
  padding: 2rem;
  border-radius: var(--veraio-radius-lg);
  border: 1px solid var(--veraio-border);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.landing-how__step:hover {
  border-color: rgba(99, 102, 241, 0.2);
  box-shadow: var(--veraio-shadow-md);
  transform: translateY(-2px);
}

.landing-how__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--veraio-accent-soft);
  color: var(--veraio-accent);
  margin-bottom: 1.25rem;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.landing-how__number {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--veraio-muted);
  margin-bottom: 0.625rem;
}

.landing-how__title {
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  margin: 0 0 0.75rem;
}

.landing-how__desc {
  font-size: 1rem;
  color: var(--veraio-muted);
  line-height: 1.65;
  margin: 0;
}

@media (min-width: 768px) {
  .landing-how__track {
    display: block;
    position: relative;
    height: 2px;
    margin: 0 2rem 3rem;
  }

  .landing-how__track-line {
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(99, 102, 241, 0.25) 20%,
      rgba(139, 92, 246, 0.25) 50%,
      rgba(99, 102, 241, 0.25) 80%,
      transparent 100%
    );
    border-radius: 999px;
  }

  .landing-how__steps {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  .landing-how__step {
    padding: 2rem 1.75rem;
  }
}
</style>
