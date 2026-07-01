<script setup lang="ts">
import type { FlowSnapshot } from '@besliswijzer/flow-schema'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const flowId = route.params.id as string

const { data: snapshot } = await useAsyncData(`preview-${flowId}`, () =>
  useAdminFetch<FlowSnapshot>(`/api/v1/admin/flows/${flowId}/preview`),
)

const previewFlow = computed(() => {
  if (!snapshot.value) return null
  const entryNode = snapshot.value.nodes.find((n) => n.isEntry) ?? snapshot.value.nodes[0]
  if (!entryNode) return null
  return {
    flowId: snapshot.value.flowId,
    versionId: snapshot.value.versionId,
    versionNumber: snapshot.value.versionNumber,
    slug: snapshot.value.slug,
    title: snapshot.value.title,
    seo: snapshot.value.seo,
    entryNode,
  }
})
</script>

<template>
  <AdminLayout>
    <template #nav>
      <NuxtLink :to="`/admin/flows/${flowId}/edit`">← Editor</NuxtLink>
    </template>

    <h1>Preview (draft)</h1>
    <p class="intro">Test je wijzigingen voordat je publiceert.</p>

    <div class="preview-wrap">
      <FlowWizard v-if="previewFlow && snapshot" :flow="previewFlow" :preview-snapshot="snapshot" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.intro {
  color: var(--color-muted);
  margin-bottom: 1.5rem;
}

.preview-wrap {
  max-width: 720px;
}
</style>
