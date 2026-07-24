<script setup lang="ts">
import type { FAQBlock } from '@besliswijzer/product-schema'

defineProps<{
  block: FAQBlock
}>()
</script>

<template>
  <section class="faq-block">
    <h2 v-if="block.data.title" class="faq-block__title">{{ block.data.title }}</h2>
    <div class="faq-block__list">
      <details
        v-for="item in block.data.items"
        :key="item.id"
        class="faq-block__item"
      >
        <summary class="faq-block__question">{{ item.question }}</summary>
        <p class="faq-block__answer">{{ item.answer }}</p>
        <span v-if="item.source === 'opportunity'" class="faq-block__source">Via opportunity discovery</span>
      </details>
    </div>
  </section>
</template>

<style scoped>
.faq-block__title {
  font-size: 1.35rem;
  margin: 0 0 1rem;
}

.faq-block__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.faq-block__item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: #fff;
}

.faq-block__question {
  cursor: pointer;
  font-weight: 600;
  list-style: none;
}

.faq-block__question::-webkit-details-marker {
  display: none;
}

.faq-block__answer {
  margin: 0.75rem 0 0;
  line-height: 1.6;
  color: var(--color-text, #334155);
}

.faq-block__source {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-muted, #64748b);
}
</style>
