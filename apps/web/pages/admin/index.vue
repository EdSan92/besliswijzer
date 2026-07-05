<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

type FlowListItem = {
  id: string
  slug: string
  title: string
  categoryId: string | null
  category: { id: string; slug: string; title: string } | null
  publishedVersionNumber: number | null
}

type CategoryItem = {
  id: string
  slug: string
  title: string
  description: string | null
  sortOrder: number
  flows: unknown[]
}

const { data: flows, refresh: refreshFlows } = await useAsyncData('admin-flows', () =>
  useAdminFetch<FlowListItem[]>('/api/v1/admin/flows'),
)

const { data: categories, refresh: refreshCategories } = await useAsyncData('admin-categories', () =>
  useAdminFetch<CategoryItem[]>('/api/v1/admin/categories'),
)

const newFlow = reactive({ slug: '', title: '', categoryId: '' as string | '' })
const newCategory = reactive({ slug: '', title: '', description: '' })
const slugManual = ref(false)
const categorySlugManual = ref(false)
const creating = ref(false)
const creatingCategory = ref(false)
const filterCategoryId = ref<string>('all')

watch(
  () => newFlow.title,
  (title) => {
    if (!slugManual.value) {
      newFlow.slug = toSlug(title)
    }
  },
)

watch(
  () => newCategory.title,
  (title) => {
    if (!categorySlugManual.value) {
      newCategory.slug = toSlug(title)
    }
  },
)

const filteredFlows = computed(() => {
  const list = flows.value ?? []
  if (filterCategoryId.value === 'all') return list
  if (filterCategoryId.value === 'none') return list.filter((f) => !f.categoryId)
  return list.filter((f) => f.categoryId === filterCategoryId.value)
})

async function createFlow() {
  creating.value = true
  try {
    await useAdminFetch('/api/v1/admin/flows', {
      method: 'POST',
      body: {
        slug: newFlow.slug,
        title: newFlow.title,
        categoryId: newFlow.categoryId || null,
        seo: { title: newFlow.title, description: newFlow.title },
      },
    })
    newFlow.slug = ''
    newFlow.title = ''
    newFlow.categoryId = ''
    slugManual.value = false
    await refreshFlows()
  } finally {
    creating.value = false
  }
}

async function createCategory() {
  creatingCategory.value = true
  try {
    await useAdminFetch('/api/v1/admin/categories', {
      method: 'POST',
      body: {
        slug: newCategory.slug,
        title: newCategory.title,
        description: newCategory.description || undefined,
        sortOrder: (categories.value?.length ?? 0) + 1,
      },
    })
    newCategory.slug = ''
    newCategory.title = ''
    newCategory.description = ''
    categorySlugManual.value = false
    await refreshCategories()
  } finally {
    creatingCategory.value = false
  }
}

async function deleteCategory(id: string) {
  if (!confirm('Categorie verwijderen? Flows blijven bestaan zonder categorie.')) return
  await useAdminFetch(`/api/v1/admin/categories/${id}`, { method: 'DELETE' })
  await refreshCategories()
  await refreshFlows()
}

const importJson = ref('')
const importPublish = ref(false)
const importOverwrite = ref(true)
const importing = ref(false)
const importMessage = ref('')

function loadImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importJson.value = String(reader.result ?? '')
  }
  reader.readAsText(file)
}

async function importFlow() {
  importing.value = true
  importMessage.value = ''
  try {
    const parsed = JSON.parse(importJson.value) as unknown
    const payload =
      parsed && typeof parsed === 'object' && 'flow' in parsed
        ? parsed
        : { publish: importPublish.value, overwrite: importOverwrite.value, flow: parsed }

    if (!('publish' in (payload as object))) {
      ;(payload as { publish: boolean }).publish = importPublish.value
    }
    if (!('overwrite' in (payload as object))) {
      ;(payload as { overwrite: boolean }).overwrite = importOverwrite.value
    }

    const result = await useAdminFetch<{ slug: string; flowId: string; published: boolean; versionNumber: number | null }>(
      '/api/v1/admin/flows/import',
      { method: 'POST', body: payload },
    )
    importMessage.value = result.published
      ? `Flow "${result.slug}" geïmporteerd en gepubliceerd als v${result.versionNumber}`
      : `Flow "${result.slug}" geïmporteerd als draft`
    importJson.value = ''
    await refreshFlows()
  } catch (error) {
    importMessage.value =
      error instanceof Error ? error.message : 'Import mislukt — controleer je JSON'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <h1>Flows & categorieën</h1>
    <p class="intro">Organiseer keuzehulpen in categorieën zoals Energie, Subsidie of Verbouwen.</p>

    <div class="admin-grid">
      <form class="card" @submit.prevent="createCategory">
        <h3>Nieuwe categorie</h3>
        <div class="form-group">
          <label>Titel</label>
          <input v-model="newCategory.title" placeholder="Energie" required />
        </div>
        <div class="form-group">
          <label>Slug</label>
          <input
            v-model="newCategory.slug"
            placeholder="energie"
            pattern="[a-z0-9-]+"
            required
            @input="categorySlugManual = true"
          />
        </div>
        <div class="form-group">
          <label>Beschrijving</label>
          <input v-model="newCategory.description" placeholder="Keuzehulpen voor energiebesparing" />
        </div>
        <button class="btn btn-secondary" type="submit" :disabled="creatingCategory">
          Categorie toevoegen
        </button>
      </form>

      <form class="card" @submit.prevent="createFlow">
        <h3>Nieuwe flow</h3>
        <div class="form-group">
          <label>Titel</label>
          <input v-model="newFlow.title" placeholder="Warmtepomp keuzehulp" required />
        </div>
        <div class="form-group">
          <label>Categorie</label>
          <select v-model="newFlow.categoryId">
            <option value="">Geen categorie</option>
            <option v-for="cat in categories ?? []" :key="cat.id" :value="cat.id">
              {{ cat.title }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>URL-slug</label>
          <input
            v-model="newFlow.slug"
            placeholder="warmtepomp-keuzehulp"
            pattern="[a-z0-9-]+"
            required
            @input="slugManual = true"
          />
        </div>
        <button class="btn" type="submit" :disabled="creating">Flow aanmaken</button>
      </form>

      <div class="card import-card">
        <h3>Flow importeren (JSON)</h3>
        <p class="hint">
          Plak JSON of upload een bestand. Ik kan flows voor je schrijven in dit formaat — zie
          <code>flows/examples/warmtepomp-keuzehulp.json</code> in de repo.
        </p>
        <div class="form-group">
          <label>JSON-bestand</label>
          <input type="file" accept="application/json,.json" @change="loadImportFile" />
        </div>
        <div class="form-group">
          <label>Of plak JSON</label>
          <textarea v-model="importJson" rows="8" placeholder='{"flow": { "slug": "...", ... }}' />
        </div>
        <label class="checkbox-row">
          <input v-model="importOverwrite" type="checkbox" />
          Bestaande flow met zelfde slug overschrijven (draft)
        </label>
        <label class="checkbox-row">
          <input v-model="importPublish" type="checkbox" />
          Direct publiceren na import
        </label>
        <button class="btn btn-secondary" type="button" :disabled="importing || !importJson.trim()" @click="importFlow">
          {{ importing ? 'Importeren…' : 'Importeren' }}
        </button>
        <p v-if="importMessage" class="import-message">{{ importMessage }}</p>
      </div>
    </div>

    <section v-if="categories?.length" class="section">
      <h2>Categorieën</h2>
      <div class="category-chips">
        <button
          type="button"
          class="chip"
          :class="{ active: filterCategoryId === 'all' }"
          @click="filterCategoryId = 'all'"
        >
          Alles
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="chip"
          :class="{ active: filterCategoryId === cat.id }"
          @click="filterCategoryId = cat.id"
        >
          {{ cat.title }} ({{ cat.flows?.length ?? 0 }})
        </button>
        <button
          type="button"
          class="chip"
          :class="{ active: filterCategoryId === 'none' }"
          @click="filterCategoryId = 'none'"
        >
          Zonder categorie
        </button>
      </div>
      <ul class="category-list card">
        <li v-for="cat in categories" :key="cat.id">
          <div>
            <strong>{{ cat.title }}</strong>
            <span>/categorie/{{ cat.slug }}</span>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="deleteCategory(cat.id)">
            Verwijderen
          </button>
        </li>
      </ul>
    </section>

    <section class="section">
      <h2>Flows</h2>
      <div v-if="!filteredFlows.length" class="card empty">Geen flows in deze selectie.</div>
      <table v-else class="table card">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Categorie</th>
            <th>Slug</th>
            <th>Versie</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="flow in filteredFlows" :key="flow.id">
            <td><strong>{{ flow.title }}</strong></td>
            <td>{{ flow.category?.title ?? '—' }}</td>
            <td><code>/flows/{{ flow.slug }}</code></td>
            <td>v{{ flow.publishedVersionNumber ?? '—' }}</td>
            <td class="actions">
              <NuxtLink class="btn btn-secondary btn-sm" :to="`/admin/flows/${flow.id}/edit`">
                Bewerken
              </NuxtLink>
              <NuxtLink class="btn btn-sm" :to="`/flows/${flow.slug}`" target="_blank">Live</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </AdminLayout>
</template>

<style scoped>
.intro {
  color: var(--color-muted);
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.import-card {
  grid-column: 1 / -1;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

textarea {
  width: 100%;
  font: inherit;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  resize: vertical;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.import-message {
  margin-top: 0.75rem;
  color: var(--color-primary);
}

.section {
  margin-bottom: 2rem;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.chip {
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: white;
  cursor: pointer;
  font: inherit;
}

.chip.active {
  background: #eff6ff;
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.category-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.category-list span {
  display: block;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.empty {
  color: var(--color-muted);
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
}

code {
  font-size: 0.875rem;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
</style>
