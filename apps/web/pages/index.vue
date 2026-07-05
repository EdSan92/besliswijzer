<script setup lang="ts">
const apiBase = useApiBase()

type FlowItem = { id: string; slug: string; title: string }
type CategoryItem = {
  id: string
  slug: string
  title: string
  description: string | null
  flows: FlowItem[]
}

const { data } = await useAsyncData('home-categories', () =>
  $fetch<{ categories: CategoryItem[]; uncategorized: FlowItem[] }>(
    `${apiBase}/api/v1/public/categories`,
  ).catch(() => ({ categories: [], uncategorized: [] })),
)

useSeoMeta({
  title: 'Besliswijzer — keuzehulpen en adviestools',
  description: 'Vind de juiste keuzehulp voor energie, subsidie, verbouwen en meer.',
})
</script>

<template>
  <div class="container">
    <header class="hero card">
      <h1>Besliswijzer</h1>
      <p>Kies een categorie en start een keuzehulp — zonder account, direct resultaat.</p>
      <NuxtLink class="btn btn-secondary" to="/admin">Admin</NuxtLink>
    </header>

    <section v-for="category in data?.categories ?? []" :key="category.id" class="category-section">
      <div class="category-header">
        <h2>{{ category.title }}</h2>
        <p v-if="category.description">{{ category.description }}</p>
        <NuxtLink :to="`/categorie/${category.slug}`" class="category-link">Alle in {{ category.title }} →</NuxtLink>
      </div>
      <div v-if="category.flows.length" class="flow-grid">
        <NuxtLink
          v-for="flow in category.flows"
          :key="flow.id"
          :to="`/flows/${flow.slug}`"
          class="flow-card card"
        >
          <strong>{{ flow.title }}</strong>
          <span>Start keuzehulp →</span>
        </NuxtLink>
      </div>
      <p v-else class="empty">Nog geen keuzehulpen in deze categorie.</p>
    </section>

    <section v-if="data?.uncategorized?.length" class="category-section">
      <h2>Overig</h2>
      <div class="flow-grid">
        <NuxtLink
          v-for="flow in data.uncategorized"
          :key="flow.id"
          :to="`/flows/${flow.slug}`"
          class="flow-card card"
        >
          <strong>{{ flow.title }}</strong>
          <span>Start keuzehulp →</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  margin-bottom: 2rem;
}

.hero p {
  color: var(--color-muted);
  max-width: 520px;
}

.category-section {
  margin-bottom: 2.5rem;
}

.category-header {
  margin-bottom: 1rem;
}

.category-header h2 {
  margin-bottom: 0.25rem;
}

.category-header p {
  color: var(--color-muted);
  margin: 0 0 0.5rem;
}

.category-link {
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
  transition: border-color 0.15s ease, transform 0.15s ease;
  color: inherit;
}

.flow-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.flow-card span {
  font-size: 0.875rem;
  color: var(--color-primary);
}

.empty {
  color: var(--color-muted);
}
</style>
