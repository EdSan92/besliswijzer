<template>
  <footer class="landing-footer">
    <div class="landing-container landing-footer__inner">
      <p class="landing-footer__brand">
        <span class="landing-footer__mark" aria-hidden="true">✦</span>
        Veraio
      </p>
      <nav class="landing-footer__links" aria-label="Footer navigatie">
        <a href="#voorbeeld-advies">Voorbeeld</a>
        <a href="#categorieen">Categorieën</a>
        <a href="#hoe-het-werkt">Hoe het werkt</a>
        <a href="#waarom">Vertrouwen</a>
      </nav>
      <p class="landing-footer__copy">© {{ new Date().getFullYear() }} Veraio — Persoonlijk aankoopadvies</p>
    </div>
  </footer>
</template>

<style scoped>
.landing-footer {
  padding: 2.5rem 0;
  border-top: 1px solid var(--veraio-border);
  background: var(--veraio-bg);
}

.landing-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 2rem;
}

.landing-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 700;
  margin: 0;
  margin-right: auto;
  color: var(--veraio-text);
}

.landing-footer__mark {
  color: var(--veraio-gold);
  font-size: 0.75rem;
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
}

.landing-footer__links a:hover {
  color: var(--veraio-primary);
}

.landing-footer__copy {
  width: 100%;
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  margin: 0.5rem 0 0;
}

@media (min-width: 768px) {
  .landing-footer__copy {
    width: auto;
    margin: 0 0 0 auto;
  }
}
</style>
