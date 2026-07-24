<script setup lang="ts">
import type { IntroBlock } from '@besliswijzer/product-schema'

defineProps<{
  block: IntroBlock
}>()
</script>

<template>
  <section class="intro-block">
    <h2 v-if="block.data.title" class="intro-block__title">{{ block.data.title }}</h2>
    <p class="intro-block__body">{{ block.data.body }}</p>
  </section>
</template>

<style scoped>
.intro-block__title {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.intro-block__body {
  color: var(--color-text, #1e293b);
  line-height: 1.7;
  margin: 0;
  max-width: 48rem;
}
</style>
