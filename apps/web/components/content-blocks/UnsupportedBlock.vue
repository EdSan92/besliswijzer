<script setup lang="ts">
import type { ContentBlock } from '@besliswijzer/product-schema'

defineProps<{
  block: ContentBlock
}>()
</script>

<template>
  <section class="unsupported-block card">
    <p class="unsupported-block__label">Bloktype nog niet geïmplementeerd</p>
    <code>{{ block.type }}</code>
  </section>
</template>

<style scoped>
.unsupported-block {
  padding: 1rem;
  background: #f8fafc;
  border-style: dashed;
}

.unsupported-block__label {
  margin: 0 0 0.5rem;
  color: var(--color-muted, #64748b);
  font-size: 0.875rem;
}
</style>
