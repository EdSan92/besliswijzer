<script setup lang="ts">
import type { PublicFlowResponse } from '@besliswijzer/flow-schema'

const route = useRoute()
const slug = route.params.slug as string
const versionQuery = route.query.v as string | undefined
const apiBase = useApiBase()

const query = versionQuery ? `?v=${versionQuery}` : ''

const { data: flow } = await useAsyncData(`flow-${slug}-${versionQuery ?? 'latest'}`, () =>
  $fetch<PublicFlowResponse>(`${apiBase}/api/v1/public/flows/${slug}${query}`).catch((err: { statusCode?: number }) => {
    if (err?.statusCode === 404) return null
    throw err
  }),
)

if (!flow.value) {
  throw createError({ statusCode: 404, statusMessage: 'Flow niet gevonden' })
}

useSeoMeta({
  title: flow.value.seo.title,
  description: flow.value.seo.description,
  ogTitle: flow.value.seo.title,
  ogDescription: flow.value.seo.description,
  ogImage: flow.value.seo.ogImage,
})
</script>

<template>
  <div class="container">
    <header style="margin-bottom: 1.5rem">
      <p class="muted">{{ flow?.title }}</p>
      <h1>{{ flow?.seo.title }}</h1>
    </header>
    <FlowWizard v-if="flow" :flow="flow" :version-query="versionQuery" />
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-muted);
  margin: 0 0 0.25rem;
}
</style>
