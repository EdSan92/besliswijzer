<script setup lang="ts">
defineProps<{
  ctaHref?: string
}>()
</script>

<template>
  <section class="landing-hero">
    <div class="landing-container landing-hero__grid">
      <div class="landing-hero__content">
        <span class="landing-badge landing-badge--brand">Persoonlijk aankoopadvies</span>

        <h1 class="landing-heading landing-heading--lg landing-hero__title">
          Koop met zekerheid.<br />
          <span class="landing-hero__accent">Niet met twijfel.</span>
        </h1>

        <p class="landing-hero__lead">
          Een verkeerde aankoop kost geld én frustratie. Veraio helpt je de juiste
          keuze te maken — één duidelijk advies, afgestemd op jouw situatie.
        </p>

        <div class="landing-hero__actions">
          <NuxtLink :to="ctaHref ?? '/flows/robotmaaiers'" class="landing-btn landing-btn--large">
            Ontvang jouw advies
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
          <a href="#voorbeeld-advies" class="landing-btn landing-btn--large landing-btn--ghost">
            Bekijk voorbeeld
          </a>
        </div>

        <ul class="landing-hero__points">
          <li>Voorkom een miskoop</li>
          <li>Eén aanbeveling, geen lijst</li>
          <li>Gratis · ~2 minuten</li>
        </ul>
      </div>

      <div class="landing-hero__visual">
        <p class="landing-hero__visual-caption">Zo zou jouw advies eruit kunnen zien</p>
        <LandingAiAdviceCard compact />
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-hero {
  padding: calc(var(--veraio-nav-height) + 2.5rem) 0 4.5rem;
  background:
    radial-gradient(ellipse 90% 70% at 80% -10%, rgba(31, 107, 92, 0.09) 0%, transparent 50%),
    radial-gradient(ellipse 60% 50% at 0% 100%, rgba(217, 164, 65, 0.07) 0%, transparent 45%),
    var(--veraio-bg);
  border-bottom: 1px solid var(--veraio-border);
}

.landing-hero__grid {
  display: grid;
  gap: 3rem;
  align-items: center;
}

.landing-hero__title {
  margin: 1.25rem 0;
}

.landing-hero__accent {
  color: var(--veraio-primary);
}

.landing-hero__lead {
  font-size: clamp(1.0625rem, 2vw, 1.1875rem);
  color: var(--veraio-muted);
  line-height: 1.65;
  max-width: 480px;
  margin: 0 0 2rem;
}

.landing-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.landing-hero__points {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--veraio-text);
}

.landing-hero__points li {
  padding-left: 1.125rem;
  position: relative;
}

.landing-hero__points li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--veraio-primary);
  font-weight: 700;
  font-size: 0.75rem;
}

.landing-hero__visual {
  position: relative;
}

.landing-hero__visual-caption {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--veraio-muted);
  text-align: center;
  margin: 0 0 0.75rem;
  letter-spacing: 0.01em;
}

@media (min-width: 960px) {
  .landing-hero {
    padding: calc(var(--veraio-nav-height) + 3.5rem) 0 5.5rem;
  }

  .landing-hero__grid {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 3.5rem;
  }

  .landing-hero__visual-caption {
    text-align: left;
  }
}
</style>
