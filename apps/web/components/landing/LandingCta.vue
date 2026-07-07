<script setup lang="ts">
defineProps<{
  ctaHref: string
}>()

const { register } = useRevealOnScroll()
</script>

<template>
  <section id="start" class="landing-section landing-cta">
    <div class="landing-container">
      <div
        :ref="(el) => register(el as Element)"
        class="landing-reveal landing-cta__frame"
      >
        <div class="landing-cta__orb landing-cta__orb--1" aria-hidden="true" />
        <div class="landing-cta__orb landing-cta__orb--2" aria-hidden="true" />

        <div class="landing-cta__inner">
          <h2 class="landing-cta__title">
            Klaar om de <span class="landing-gradient-text">juiste keuze</span> te maken?
          </h2>
          <p class="landing-cta__text">
            Start vandaag nog met een keuzehulp en ontdek welk product het beste bij jou past.
          </p>
          <NuxtLink :to="ctaHref" class="landing-btn landing-btn--large landing-btn--gradient">
            Start keuzehulp
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
          <p class="landing-cta__footnote">Gratis · Geen registratie vereist</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-cta {
  padding-bottom: 5rem;
}

.landing-cta__frame {
  position: relative;
  padding: 1px;
  border-radius: calc(var(--veraio-radius-lg) + 2px);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.4) 0%,
    rgba(139, 92, 246, 0.2) 35%,
    rgba(0, 0, 0, 0.06) 70%,
    rgba(99, 102, 241, 0.25) 100%
  );
  box-shadow: var(--veraio-shadow-glow);
  overflow: hidden;
}

.landing-cta__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
}

.landing-cta__orb--1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -60px;
  background: rgba(99, 102, 241, 0.15);
}

.landing-cta__orb--2 {
  width: 240px;
  height: 240px;
  bottom: -80px;
  left: -40px;
  background: rgba(139, 92, 246, 0.12);
}

.landing-cta__inner {
  position: relative;
  text-align: center;
  padding: 5rem 2rem;
  border-radius: var(--veraio-radius-lg);
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 55%),
    var(--veraio-surface);
}

.landing-cta__title {
  font-size: clamp(2rem, 4vw, 2.875rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.12;
  margin: 0 0 1rem;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}

.landing-cta__text {
  font-size: 1.125rem;
  color: var(--veraio-muted);
  line-height: 1.65;
  max-width: 440px;
  margin: 0 auto 2rem;
}

.landing-cta__footnote {
  margin: 1.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--veraio-muted);
}
</style>
