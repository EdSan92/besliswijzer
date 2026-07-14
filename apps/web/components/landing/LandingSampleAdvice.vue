<script setup lang="ts">
const { register } = useRevealOnScroll()
</script>

<template>
  <section id="voorbeeld-advies" class="sample-advice">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal sample-advice__grid"
      >
        <div class="sample-advice__intro">
          <p class="landing-eyebrow">Voorbeeldadvies</p>
          <h2 class="landing-heading">Dit is wat je krijgt — geen productlijst</h2>
          <p class="landing-body">
            Geen twintig tabbladen open. Geen eindeloos scrollen door reviews.
            Eén product dat past, met een matchscore en duidelijke uitleg.
          </p>
          <p class="landing-body sample-advice__note">
            Stel je voor: je weet precies welk product je moet kopen, en waarom.
            Dat is wat Veraio voor je doet.
          </p>

          <div class="sample-advice__trust">
            <p class="sample-advice__trust-title">Waarop is dit advies gebaseerd?</p>
            <ul class="sample-advice__trust-list">
              <li>Jouw antwoorden over situatie en wensen</li>
              <li>Productspecificaties en expertcriteria</li>
              <li>Onafhankelijk — Veraio verkoopt geen producten</li>
            </ul>
          </div>
        </div>

        <LandingAiAdviceCard show-cta cta-href="/flows/robotmaaiers" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sample-advice {
  padding: 5.5rem 0;
  background: linear-gradient(180deg, var(--veraio-surface-muted) 0%, var(--veraio-bg) 100%);
}

.sample-advice__grid {
  display: grid;
  gap: 3rem;
  align-items: start;
}

.sample-advice__intro .landing-body + .landing-body {
  margin-top: 1rem;
}

.sample-advice__note {
  margin-bottom: 1.75rem !important;
}

.sample-advice__trust {
  padding: 1.25rem 1.375rem;
  background: var(--veraio-surface);
  border: 1px solid rgba(31, 107, 92, 0.1);
  border-left: 3px solid var(--veraio-gold);
  border-radius: var(--veraio-radius);
}

.sample-advice__trust-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--veraio-text);
  margin: 0 0 0.625rem;
}

.sample-advice__trust-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.375rem;
}

.sample-advice__trust-list li {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  padding-left: 1rem;
  position: relative;
  line-height: 1.45;
}

.sample-advice__trust-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--veraio-primary);
}

@media (min-width: 900px) {
  .sample-advice__grid {
    grid-template-columns: 1fr 1.05fr;
    gap: 4rem;
    align-items: center;
  }
}
</style>
