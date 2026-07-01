<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const apiBase = useApiBase()

type FlowItem = { id: string; slug: string; title: string }
type CategoryDetail = {
  slug: string
  title: string
  description: string | null
  flows: FlowItem[]
}

const { data, error } = await useAsyncData(`category-${slug}`, () =>
  $fetch<CategoryDetail>(`${apiBase}/api/v1/public/categories/${slug}`),
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categorie niet gevonden' })
}

useSeoMeta({
  title: `${data.value.title} — Besliswijzer`,
  description: data.value.description ?? `Keuzehulpen in ${data.value.title}`,
})
</script>

<template>
  <div class="container">
    <NuxtLink to="/" class="back">← Alle categorieën</NuxtLink>
    <header class="card" style="margin-bottom: 1.5rem">
      <h1>{{ data?.title }}</h1>
      <p v-if="data?.description">{{ data.description }}</p>
    </header>

    <div v-if="data?.flows.length" class="flow-grid">
      <NuxtLink
        v-for="flow in data.flows"
        :key="flow.id"
        :to="`/flows/${flow.slug}`"
        class="flow-card card"
      >
        <strong>{{ flow.title }}</strong>
        <span>Start keuzehulp →</span>
      </NuxtLink>
    </div>
    <p v-else class="card empty">Nog geen keuzehulpen in deze categorie.</p>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.flow-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: inherit;
  transition: border-color 0.15s ease;
}

.flow-card:hover {
  border-color: var(--color-primary);
}

.flow-card span {
  font-size: 0.875rem;
  color: var(--color-primary);
}

.empty {
  color: var(--color-muted);
}
</style>
