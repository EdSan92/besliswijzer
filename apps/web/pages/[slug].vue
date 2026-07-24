<script setup lang="ts">
import type { PublicProductPageResponse } from '@besliswijzer/product-schema'
import ProductPageRenderer from '~/components/content-blocks/ProductPageRenderer.vue'

const route = useRoute()
const slug = route.params.slug as string
const apiBase = useApiBase()

const { data: page, pending, error } = await useAsyncData(`product-page-${slug}`, () =>
  $fetch<PublicProductPageResponse>(`${apiBase}/api/v1/public/pages/${slug}`).catch(
    (err: { statusCode?: number }) => {
      if (err?.statusCode === 404) return null
      throw err
    },
  ),
)

if (error.value) {
  throw createError({
    statusCode: 502,
    statusMessage: 'Productpagina kon niet geladen worden',
  })
}

if (!pending.value && !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Pagina niet gevonden' })
}
</script>

<template>
  <div class="container product-page-wrap">
    <NuxtLink to="/" class="back">← Terug naar home</NuxtLink>
    <p v-if="pending" class="muted">Laden…</p>
    <ProductPageRenderer v-else-if="page" :page="page" />
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.product-page-wrap {
  max-width: 800px;
  margin: 0 auto;
  padding-top: 1rem;
}

.muted {
  color: var(--color-muted);
}
</style>
