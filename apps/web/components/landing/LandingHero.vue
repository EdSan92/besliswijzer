<script setup lang="ts">
import type { PopularFlowItem } from '@besliswijzer/flow-schema'

defineProps<{
  ctaHref?: string
  popularFlows?: PopularFlowItem[]
}>()
</script>

<template>
  <section class="landing-hero">
    <div class="landing-dot-grid" aria-hidden="true" />
    <div class="landing-hero__orb landing-hero__orb--1" aria-hidden="true" />
    <div class="landing-hero__orb landing-hero__orb--2" aria-hidden="true" />
    <div class="landing-hero__orb landing-hero__orb--3" aria-hidden="true" />

    <div class="landing-container landing-hero__grid">
      <div class="landing-hero__content">
        <p class="landing-hero__eyebrow">
          <span class="landing-hero__eyebrow-dot" aria-hidden="true" />
          Persoonlijke productadviezen
        </p>

        <h1 class="landing-hero__title">
          Vind het product dat
          <span class="landing-gradient-text">écht bij jou past</span>
        </h1>

        <p class="landing-hero__subtitle">
          Beantwoord een paar vragen en krijg een persoonlijke aanbeveling — helder, onderbouwd en op maat.
        </p>

        <div class="landing-hero__search">
          <LandingFlowSearch variant="hero" />
        </div>

        <div class="landing-hero__actions">
          <NuxtLink :to="ctaHref ?? '#voorbeelden'" class="landing-btn landing-btn--large landing-btn--gradient">
            Start keuzehulp
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
          <a href="#hoe-het-werkt" class="landing-btn landing-btn--large landing-btn--ghost">
            Bekijk hoe het werkt
          </a>
        </div>

        <div class="landing-hero__trust">
          <span>Gratis</span>
          <span class="landing-hero__trust-sep" aria-hidden="true" />
          <span>Geen account</span>
          <span class="landing-hero__trust-sep" aria-hidden="true" />
          <span>Resultaat in 2 minuten</span>
        </div>

        <div v-if="popularFlows?.length" class="landing-hero__quick">
          <span class="landing-hero__quick-label">Populair:</span>
          <NuxtLink
            v-for="flow in popularFlows.slice(0, 3)"
            :key="flow.id"
            :to="`/flows/${flow.slug}`"
            class="landing-hero__quick-link"
          >
            {{ flow.title }}
          </NuxtLink>
        </div>
      </div>

      <div class="landing-hero__preview-wrap">
        <div class="landing-hero__badge landing-hero__badge--top" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.6 3.5L7 9.5 3.9 11l.6-3.5L2 5l3.5-.5L7 1z" fill="currentColor"/>
          </svg>
          98% tevreden
        </div>

        <div class="landing-glow-frame">
          <div class="landing-glow-frame__inner">
            <LandingHeroPreview />
          </div>
        </div>

        <div class="landing-hero__badge landing-hero__badge--bottom" aria-hidden="true">
          <span class="landing-hero__badge-pulse" />
          Live preview
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-hero {
  position: relative;
  padding: calc(var(--veraio-nav-height) + 4rem) 0 4rem;
  background: var(--veraio-gradient-subtle);
  overflow: hidden;
}

.landing-hero__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  animation: landing-gradient-shift 14s ease-in-out infinite;
}

.landing-hero__orb--1 {
  width: 520px;
  height: 520px;
  top: -140px;
  right: -100px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 68%);
}

.landing-hero__orb--2 {
  width: 400px;
  height: 400px;
  bottom: -80px;
  left: -120px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, transparent 68%);
  animation-delay: -7s;
}

.landing-hero__orb--3 {
  width: 280px;
  height: 280px;
  top: 40%;
  left: 45%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, transparent 70%);
  animation-delay: -3s;
}

.landing-hero__grid {
  position: relative;
  display: grid;
  gap: 4rem;
  align-items: center;
}

.landing-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--veraio-accent);
  margin: 0 0 1.5rem;
  padding: 0.375rem 0.875rem 0.375rem 0.625rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(99, 102, 241, 0.12);
  backdrop-filter: blur(8px);
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.landing-hero__eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--veraio-gradient);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
  animation: landing-pulse-dot 2.5s ease-in-out infinite;
}

.landing-hero__title {
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.04;
  margin: 0 0 1.5rem;
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}

.landing-hero__subtitle {
  font-size: clamp(1.125rem, 2.5vw, 1.375rem);
  color: var(--veraio-muted);
  line-height: 1.65;
  max-width: 500px;
  margin: 0 0 1.75rem;
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.landing-hero__search {
  margin-bottom: 2rem;
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
}

.landing-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  margin-bottom: 2rem;
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

.landing-hero__trust {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--veraio-muted);
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
}

.landing-hero__trust-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.15);
}

.landing-hero__quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  animation: landing-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
}

.landing-hero__quick-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--veraio-muted);
}

.landing-hero__quick-link {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--veraio-text);
  text-decoration: none;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--veraio-border);
  background: rgba(255, 255, 255, 0.75);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.landing-hero__quick-link:hover {
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--veraio-accent);
  background: var(--veraio-accent-soft);
}

.landing-hero__preview-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  animation: landing-fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
}

.landing-hero__badge {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--veraio-text);
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--veraio-border);
  box-shadow: var(--veraio-shadow-md);
  backdrop-filter: blur(12px);
  white-space: nowrap;
  z-index: 2;
}

.landing-hero__badge--top {
  top: -12px;
  right: -8px;
  color: var(--veraio-accent);
}

.landing-hero__badge--bottom {
  bottom: 24px;
  left: -16px;
}

.landing-hero__badge-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  animation: landing-pulse-dot 2s ease-in-out infinite;
}

@media (min-width: 960px) {
  .landing-hero {
    padding: calc(var(--veraio-nav-height) + 6rem) 0 5rem;
  }

  .landing-hero__grid {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 3rem;
  }

  .landing-hero__preview-wrap {
    justify-content: flex-end;
  }

  .landing-hero__badge--top {
    right: 0;
  }

  .landing-hero__badge--bottom {
    left: -24px;
  }
}
</style>
