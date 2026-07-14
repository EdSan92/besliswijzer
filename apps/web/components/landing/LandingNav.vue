<script setup lang="ts">
const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 16
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header class="landing-nav" :class="{ 'landing-nav--scrolled': scrolled }">
    <div class="landing-container landing-nav__inner">
      <NuxtLink to="/" class="landing-nav__logo">
        <span class="landing-nav__mark" aria-hidden="true">✦</span>
        Veraio
      </NuxtLink>

      <nav class="landing-nav__links" aria-label="Hoofdnavigatie">
        <a href="#voorbeeld-advies">Voorbeeld</a>
        <a href="#categorieen">Categorieën</a>
        <a href="#hoe-het-werkt">Hoe het werkt</a>
        <a href="#waarom">Vertrouwen</a>
      </nav>

      <div class="landing-nav__search">
        <LandingFlowSearch variant="compact" placeholder="Zoek advies…" />
      </div>

      <NuxtLink to="#start" class="landing-btn landing-nav__cta">
        Ontvang advies
      </NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: var(--veraio-nav-height);
  background: rgba(250, 248, 243, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.landing-nav--scrolled {
  border-bottom-color: var(--veraio-border);
}

.landing-nav__inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 100%;
}

.landing-nav__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--veraio-text);
  text-decoration: none;
  flex-shrink: 0;
}

.landing-nav__mark {
  color: var(--veraio-gold);
  font-size: 0.875rem;
}

.landing-nav__links {
  display: none;
  gap: 1.5rem;
}

.landing-nav__links a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--veraio-muted);
  text-decoration: none;
}

.landing-nav__links a:hover {
  color: var(--veraio-primary);
}

.landing-nav__search {
  display: none;
  flex: 1;
  max-width: 220px;
  margin-left: auto;
}

.landing-nav__cta {
  padding: 0.5625rem 1.125rem;
  font-size: 0.8125rem;
  flex-shrink: 0;
  margin-left: auto;
}

@media (min-width: 768px) {
  .landing-nav__links {
    display: flex;
  }

  .landing-nav__cta {
    margin-left: 0;
  }
}

@media (min-width: 1024px) {
  .landing-nav__search {
    display: block;
  }
}
</style>
