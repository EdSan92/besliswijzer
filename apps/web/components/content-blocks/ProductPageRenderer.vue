<script setup lang="ts">
import type { PublicProductPageResponse } from '@besliswijzer/product-schema'

const props = defineProps<{
  page: PublicProductPageResponse
}>()

const { getComponent, sortVisibleBlocks } = useBlockRegistry()

const orderedBlocks = computed(() =>
  sortVisibleBlocks(props.page.blocks, props.page.layout.blockOrder ?? []),
)

useProductPageSeo(props.page)
</script>

<template>
  <article class="product-page">
    <component
      v-for="block in orderedBlocks"
      :key="block.id"
      :is="getComponent(block.type)"
      :block="block"
      :page="page"
    />
  </article>
</template>

<style scoped>
.product-page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding-bottom: 3rem;
}
</style>
