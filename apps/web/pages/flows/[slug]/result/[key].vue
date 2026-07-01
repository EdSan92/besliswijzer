<script setup lang="ts">
import type { FlowResult } from '@besliswijzer/flow-schema'

const route = useRoute()
const slug = route.params.slug as string
const resultKey = route.params.key as string
const versionQuery = route.query.v as string | undefined
const apiBase = useApiBase()

const query = versionQuery ? `?v=${versionQuery}` : ''

const { data, error } = await useAsyncData(`result-${slug}-${resultKey}`, () =>
  $fetch<{ flowId: string; versionId: string; result: FlowResult }>(
    `${apiBase}/api/v1/public/flows/${slug}/results/${resultKey}${query}`,
  ),
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Resultaat niet gevonden' })
}

useSeoMeta({
  title: data.value.result.title,
  description: String(data.value.result.body.summary ?? data.value.result.title),
})
</script>

<template>
  <div class="container">
    <div v-if="data" class="card">
      <FlowResultView
        :result="data.result"
        :flow-id="data.flowId"
        :version-id="data.versionId"
        session-id="ssr"
      />
      <NuxtLink :to="`/flows/${slug}`" class="btn btn-secondary" style="margin-top: 1.5rem">
        Opnieuw starten
      </NuxtLink>
    </div>
  </div>
</template>
