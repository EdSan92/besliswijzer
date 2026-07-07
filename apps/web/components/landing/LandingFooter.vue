<template>
  <footer class="landing-footer">
    <div class="landing-container landing-footer__inner">
      <div class="landing-footer__brand">
        <NuxtLink to="/" class="landing-footer__logo">
          <span class="landing-footer__mark" aria-hidden="true" />
          Veraio
        </NuxtLink>
        <p class="landing-footer__tagline">
          Slimme keuzehulpen voor betere beslissingen.
        </p>
      </div>

      <nav class="landing-footer__links" aria-label="Footer navigatie">
        <a href="#populair">Populair</a>
        <a href="#hoe-het-werkt">Hoe het werkt</a>
        <a href="#voorbeelden">Alle keuzehulpen</a>
        <a href="#waarom">Waarom Veraio</a>
      </nav>

      <p class="landing-footer__copy">
        © {{ new Date().getFullYear() }} Veraio
      </p>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer {
  padding: 3rem 0;
  border-top: 1px solid var(--veraio-border);
}

.landing-footer__inner {
  display: grid;
  gap: 2rem;
}

.landing-footer__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--veraio-text);
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.landing-footer__mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--veraio-gradient);
}

.landing-footer__tagline {
  font-size: 0.875rem;
  color: var(--veraio-muted);
  margin: 0;
}

.landing-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.landing-footer__links a {
  font-size: 0.875rem;
  color: var(--veraio-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.landing-footer__links a:hover {
  color: var(--veraio-text);
}

.landing-footer__copy {
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  margin: 0;
}

@media (min-width: 768px) {
  .landing-footer__inner {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
  }

  .landing-footer__brand {
    grid-column: 1;
    grid-row: 1;
  }

  .landing-footer__links {
    grid-column: 2;
    grid-row: 1;
  }

  .landing-footer__copy {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
