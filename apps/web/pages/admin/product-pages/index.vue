<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

type ProductPageListItem = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  blockCount: number
  updatedAt: string
  seoTitle: string | null
  product: {
    id: string
    slug: string
    title: string
    primaryFlowSlug: string | null
    categoryTitle: string | null
  }
}

const statusFilter = ref<'all' | 'draft' | 'published'>('all')
const actionSlug = ref<string | null>(null)
const regeneratingSlug = ref<string | null>(null)
const generatingProductSlug = ref<string | null>(null)
const message = ref('')
const errorMessage = ref('')

const { data, error, refresh, pending } = await useAsyncData('admin-product-pages', () =>
  useAdminFetch<{ pages: ProductPageListItem[] }>('/api/v1/admin/product-pages'),
)

type AdminProductListItem = {
  id: string
  slug: string
  title: string
  canonicalName: string
  categoryTitle: string | null
  primaryFlowId: string | null
  primaryFlowSlug: string | null
  pageSlug: string | null
  keywordCount: number
}

const {
  data: productsData,
  refresh: refreshProducts,
} = await useAsyncData('admin-products', () =>
  useAdminFetch<{ products: AdminProductListItem[] }>('/api/v1/admin/products'),
)

const pages = computed(() => data.value?.pages ?? [])

const pendingProducts = computed(() =>
  (productsData.value?.products ?? []).filter(
    (product) => !product.pageSlug && product.primaryFlowSlug,
  ),
)

const filteredPages = computed(() => {
  if (statusFilter.value === 'all') return pages.value
  return pages.value.filter((page) => page.status === statusFilter.value)
})

const draftCount = computed(() => pages.value.filter((page) => page.status === 'draft').length)
const publishedCount = computed(
  () => pages.value.filter((page) => page.status === 'published').length,
)

function formatDate(value: string) {
  return new Date(value).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: ProductPageListItem['status']) {
  return status === 'published' ? 'Gepubliceerd' : 'Concept'
}

async function publishPage(slug: string) {
  actionSlug.value = slug
  message.value = ''
  errorMessage.value = ''
  try {
    await useAdminFetch(`/api/v1/admin/product-pages/${slug}/publish`, { method: 'POST' })
    message.value = `Pagina /${slug} is gepubliceerd.`
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Publiceren mislukt.'
  } finally {
    actionSlug.value = null
  }
}

async function unpublishPage(slug: string) {
  if (!confirm(`Pagina /${slug} offline halen? Bezoekers zien hem dan niet meer.`)) return

  actionSlug.value = slug
  message.value = ''
  errorMessage.value = ''
  try {
    await useAdminFetch(`/api/v1/admin/product-pages/${slug}/unpublish`, { method: 'POST' })
    message.value = `Pagina /${slug} staat weer als concept.`
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Depubliceren mislukt.'
  } finally {
    actionSlug.value = null
  }
}

async function regeneratePage(page: ProductPageListItem) {
  const prompt =
    page.status === 'published'
      ? `AI genereert nieuwe content voor /${page.slug}. De pagina blijft gepubliceerd; bestaande teksten worden overschreven. Doorgaan?`
      : `AI genereert nieuwe content voor /${page.slug}. Bestaande concept-content wordt overschreven. Doorgaan?`

  if (!confirm(prompt)) return

  regeneratingSlug.value = page.slug
  message.value = ''
  errorMessage.value = ''
  try {
    await useAdminFetch(`/api/v1/admin/product-pages/${page.slug}/regenerate`, { method: 'POST' })
    message.value = `Nieuwe content gegenereerd voor /${page.slug}. Bekijk de preview.`
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Content genereren mislukt.'
  } finally {
    regeneratingSlug.value = null
  }
}

async function generatePageForProduct(product: AdminProductListItem) {
  if (
    !confirm(
      `AI genereert een productpagina voor ${product.title} (flow: ${product.primaryFlowSlug}). Doorgaan?`,
    )
  ) {
    return
  }

  generatingProductSlug.value = product.slug
  message.value = ''
  errorMessage.value = ''
  try {
    const result = await useAdminFetch<{ pageSlug: string }>(
      `/api/v1/admin/products/${product.slug}/generate-page`,
      { method: 'POST' },
    )
    message.value = `Productpagina /${result.pageSlug} gegenereerd. Bekijk de preview.`
    await Promise.all([refresh(), refreshProducts()])
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Productpagina genereren mislukt.'
  } finally {
    generatingProductSlug.value = null
  }
}

useHead({ title: 'Productpagina\'s — Admin' })
</script>

<template>
  <AdminLayout>
    <header class="product-pages__header">
      <div>
        <h1>Productpagina's</h1>
        <p class="product-pages__intro">
          Beheer AI-gegenereerde productpagina's: preview, opnieuw genereren, publiceren en live bekijken.
          Producten zonder pagina kun je hier direct genereren.
        </p>
      </div>
      <NuxtLink to="/admin/opportunities" class="btn btn-secondary">
        + Nieuwe pagina genereren
      </NuxtLink>
    </header>

    <p v-if="error" class="product-pages__error" role="alert">
      {{ error instanceof Error ? error.message : 'Kon productpagina\'s niet laden.' }}
    </p>
    <p v-if="errorMessage" class="product-pages__error" role="alert">{{ errorMessage }}</p>
    <p v-if="message" class="product-pages__success" role="status">{{ message }}</p>

    <section class="card product-pages__filters">
      <button
        type="button"
        class="chip"
        :class="{ active: statusFilter === 'all' }"
        @click="statusFilter = 'all'"
      >
        Alles ({{ pages.length }})
      </button>
      <button
        type="button"
        class="chip"
        :class="{ active: statusFilter === 'draft' }"
        @click="statusFilter = 'draft'"
      >
        Concept ({{ draftCount }})
      </button>
      <button
        type="button"
        class="chip"
        :class="{ active: statusFilter === 'published' }"
        @click="statusFilter = 'published'"
      >
        Gepubliceerd ({{ publishedCount }})
      </button>
    </section>

    <section v-if="pendingProducts.length" class="section">
      <h2 class="product-pages__section-title">Nog geen productpagina</h2>
      <p class="product-pages__section-intro">
        Deze producten hebben een flow maar nog geen AI-pagina.
      </p>
      <table class="table card">
        <thead>
          <tr>
            <th>Product</th>
            <th>Flow</th>
            <th>Keywords</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in pendingProducts" :key="product.id">
            <td>
              <strong>{{ product.title }}</strong>
              <span class="product-pages__slug">{{ product.slug }}</span>
              <span v-if="product.categoryTitle" class="product-pages__meta">
                {{ product.categoryTitle }}
              </span>
            </td>
            <td>
              <code>/flows/{{ product.primaryFlowSlug }}</code>
            </td>
            <td>{{ product.keywordCount }}</td>
            <td class="actions">
              <button
                class="btn btn-sm"
                type="button"
                :disabled="generatingProductSlug === product.slug"
                @click="generatePageForProduct(product)"
              >
                {{ generatingProductSlug === product.slug ? 'Genereren…' : 'Genereer pagina' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <p v-if="pending" class="card empty">Laden…</p>
      <p v-else-if="!filteredPages.length" class="card empty">
        Geen productpagina's in deze filter.
        <NuxtLink to="/admin/opportunities">Genereer er een via Opportunities</NuxtLink>.
      </p>

      <table v-else class="table card">
        <thead>
          <tr>
            <th>Pagina</th>
            <th>Product</th>
            <th>Flow</th>
            <th>Status</th>
            <th>Blokken</th>
            <th>Bijgewerkt</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="page in filteredPages" :key="page.id">
            <td>
              <strong>{{ page.title }}</strong>
              <span class="product-pages__slug">/{{ page.slug }}</span>
              <span v-if="page.seoTitle" class="product-pages__seo">{{ page.seoTitle }}</span>
            </td>
            <td>
              {{ page.product.title }}
              <span v-if="page.product.categoryTitle" class="product-pages__meta">
                {{ page.product.categoryTitle }}
              </span>
            </td>
            <td>
              <code v-if="page.product.primaryFlowSlug">/flows/{{ page.product.primaryFlowSlug }}</code>
              <span v-else class="product-pages__meta">—</span>
            </td>
            <td>
              <span
                class="product-pages__status"
                :class="{
                  'product-pages__status--published': page.status === 'published',
                  'product-pages__status--draft': page.status === 'draft',
                }"
              >
                {{ statusLabel(page.status) }}
              </span>
            </td>
            <td>{{ page.blockCount }}</td>
            <td>{{ formatDate(page.updatedAt) }}</td>
            <td class="actions">
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="regeneratingSlug === page.slug || actionSlug === page.slug"
                @click="regeneratePage(page)"
              >
                {{ regeneratingSlug === page.slug ? 'Genereren…' : 'Opnieuw genereren' }}
              </button>
              <NuxtLink
                class="btn btn-secondary btn-sm"
                :to="`/admin/product-pages/${page.slug}/preview`"
              >
                Preview
              </NuxtLink>
              <NuxtLink
                v-if="page.status === 'published'"
                class="btn btn-sm"
                :to="`/${page.slug}`"
                target="_blank"
              >
                Live
              </NuxtLink>
              <button
                v-if="page.status === 'draft'"
                class="btn btn-sm"
                type="button"
                :disabled="actionSlug === page.slug"
                @click="publishPage(page.slug)"
              >
                {{ actionSlug === page.slug ? 'Publiceren…' : 'Publiceren' }}
              </button>
              <button
                v-else
                class="btn btn-secondary btn-sm"
                type="button"
                :disabled="actionSlug === page.slug"
                @click="unpublishPage(page.slug)"
              >
                {{ actionSlug === page.slug ? 'Bezig…' : 'Depubliceren' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </AdminLayout>
</template>

<style scoped>
.product-pages__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.product-pages__header h1 {
  margin: 0 0 0.35rem;
}

.product-pages__intro {
  margin: 0;
  color: var(--color-muted);
  max-width: 42rem;
}

.product-pages__section-title {
  margin: 0 0 0.35rem;
  font-size: 1.125rem;
}

.product-pages__section-intro {
  margin: 0 0 1rem;
  color: var(--color-muted);
}

.product-pages__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.product-pages__error {
  color: #b91c1c;
  margin: 0 0 1rem;
}

.product-pages__success {
  color: var(--color-primary);
  margin: 0 0 1rem;
}

.product-pages__slug {
  display: block;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.product-pages__seo,
.product-pages__meta {
  display: block;
  font-size: 0.8125rem;
  color: var(--color-muted);
}

.product-pages__status {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.product-pages__status--draft {
  background: #fef3c7;
  color: #92400e;
}

.product-pages__status--published {
  background: #dcfce7;
  color: #166534;
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
  font-size: 0.8125rem;
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
</style>
