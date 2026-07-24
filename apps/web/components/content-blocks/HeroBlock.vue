<script setup lang="ts">
import type { HeroBlock } from '@besliswijzer/product-schema'

defineProps<{
  block: HeroBlock
}>()
</script>

<template>
  <header class="hero-block">
    <div class="hero-block__badges" v-if="block.data.badges?.length">
      <span v-for="badge in block.data.badges" :key="badge" class="hero-block__badge">{{ badge }}</span>
    </div>
    <h1 class="hero-block__title">{{ block.data.headline }}</h1>
    <p v-if="block.data.subheadline" class="hero-block__subtitle">{{ block.data.subheadline }}</p>
    <img
      v-if="block.data.image"
      class="hero-block__image"
      :src="block.data.image.src"
      :alt="block.data.image.alt"
      loading="lazy"
    />
  </header>
</template>

<style scoped>
.hero-block {
  padding: 2rem 0 0.5rem;
}

.hero-block__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.hero-block__badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--color-surface-2, #f1f5f9);
  color: var(--color-muted, #64748b);
}

.hero-block__title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.15;
  margin: 0 0 0.75rem;
}

.hero-block__subtitle {
  font-size: 1.125rem;
  color: var(--color-muted, #64748b);
  max-width: 42rem;
  margin: 0;
  line-height: 1.6;
}

.hero-block__image {
  margin-top: 1.5rem;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: 12px;
}
</style>
