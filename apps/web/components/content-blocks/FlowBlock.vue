<script setup lang="ts">
import type { FlowBlock, PublicProductPageResponse } from '@besliswijzer/product-schema'
import type { PublicFlowResponse } from '@besliswijzer/flow-schema'

const props = defineProps<{
  block: FlowBlock
  page: PublicProductPageResponse
}>()

const apiBase = useApiBase()
const flowSlug = computed(() => props.block.data.flowSlug)

const { data: flow, error, pending } = await useAsyncData(
  `flow-embed-${flowSlug.value}`,
  () =>
    $fetch<PublicFlowResponse>(`${apiBase}/api/v1/public/flows/${flowSlug.value}`).catch(
      (err: { statusCode?: number }) => {
        if (err?.statusCode === 404) return null
        throw err
      },
    ),
)
</script>

<template>
  <section
    :id="block.data.anchorId ?? 'keuzehulp'"
    class="flow-block card"
  >
    <header class="flow-block__head">
      <h2>{{ block.data.ctaLabel ?? 'Keuzehulp' }}</h2>
      <p class="flow-block__hint">Persoonlijk advies op basis van jouw antwoorden</p>
    </header>

    <p v-if="pending" class="flow-block__loading">Keuzehulp laden…</p>
    <p v-else-if="error" class="flow-block__error">De keuzehulp kon niet geladen worden.</p>
    <p v-else-if="!flow" class="flow-block__error">
      De keuzehulp is nog niet gepubliceerd. Publiceer de flow in Admin → Flows.
    </p>
    <FlowWizard v-else :flow="flow" />
  </section>
</template>

<style scoped>
.flow-block__head {
  margin-bottom: 1.25rem;
}

.flow-block__head h2 {
  margin: 0 0 0.25rem;
}

.flow-block__hint {
  margin: 0;
  color: var(--color-muted, #64748b);
  font-size: 0.95rem;
}

.flow-block__loading {
  color: var(--color-muted, #64748b);
  margin: 0;
}

.flow-block__error {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0;
}
</style>
