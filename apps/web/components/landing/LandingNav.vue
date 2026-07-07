<script setup lang="ts">
const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => {
    scrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header class="landing-nav" :class="{ 'landing-nav--scrolled': scrolled }">
    <div class="landing-container">
      <div class="landing-nav__bar" :class="{ 'landing-nav__bar--scrolled': scrolled }">
        <NuxtLink to="/" class="landing-nav__logo">
          <span class="landing-nav__mark" aria-hidden="true" />
          Veraio
        </NuxtLink>

      <nav class="landing-nav__links" aria-label="Hoofdnavigatie">
        <a href="#populair">Populair</a>
        <a href="#hoe-het-werkt">Hoe het werkt</a>
        <a href="#voorbeelden">Alle keuzehulpen</a>
        <a href="#waarom">Waarom Veraio</a>
      </nav>

      <div class="landing-nav__search">
        <LandingFlowSearch variant="compact" placeholder="Zoeken…" />
      </div>

        <NuxtLink to="#start" class="landing-btn landing-btn--gradient landing-nav__cta">
          Start keuzehulp
        </NuxtLink>
      </div>
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
  padding: 1rem 0;
  transition: padding 0.3s ease;
}

.landing-nav--scrolled {
  padding: 0.625rem 0;
}

.landing-nav__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 52px;
  transition: height 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease;
}

.landing-nav__bar--scrolled {
  height: 56px;
  padding: 0 1.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  border: 1px solid var(--veraio-border);
  box-shadow: var(--veraio-shadow-md);
}

.landing-nav__logo {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--veraio-text);
  text-decoration: none;
}

.landing-nav__mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--veraio-gradient);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.landing-nav__links {
  display: none;
  gap: 2rem;
}

.landing-nav__links a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--veraio-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.landing-nav__links a:hover {
  color: var(--veraio-text);
}

.landing-nav__cta {
  padding: 0.5rem 1.125rem;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.landing-nav__search {
  display: none;
  flex: 1;
  max-width: 240px;
  margin-left: auto;
}

@media (min-width: 768px) {
  .landing-nav__links {
    display: flex;
  }
}

@media (min-width: 1024px) {
  .landing-nav__search {
    display: block;
  }
}
</style>
