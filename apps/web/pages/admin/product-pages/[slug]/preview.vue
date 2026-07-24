<script setup lang="ts">
import type { PublicProductPageResponse } from '@besliswijzer/product-schema'
import ProductPageRenderer from '~/components/content-blocks/ProductPageRenderer.vue'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const slug = route.params.slug as string

type AdminProductPageDetail = PublicProductPageResponse & {
  id: string
  status: 'draft' | 'published'
  updatedAt: string
}

const regenerating = ref(false)
const regenerateError = ref('')
const regenerateMessage = ref('')

const { data: page, error, refresh } = await useAsyncData(`admin-product-page-${slug}`, () =>
  useAdminFetch<AdminProductPageDetail>(`/api/v1/admin/product-pages/${slug}`),
)

if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Productpagina niet gevonden' })
}

async function regenerateContent() {
  const prompt =
    page.value?.status === 'published'
      ? 'Nieuwe AI-content vervangt de huidige pagina. De pagina blijft gepubliceerd. Doorgaan?'
      : 'Nieuwe AI-content vervangt het huidige concept. Doorgaan?'

  if (!confirm(prompt)) return

  regenerating.value = true
  regenerateError.value = ''
  regenerateMessage.value = ''
  try {
    await useAdminFetch(`/api/v1/admin/product-pages/${slug}/regenerate`, { method: 'POST' })
    regenerateMessage.value = 'Nieuwe content gegenereerd.'
    await refresh()
  } catch (err) {
    regenerateError.value = err instanceof Error ? err.message : 'Content genereren mislukt.'
  } finally {
    regenerating.value = false
  }
}

useHead({ title: `${page.value.title} — Preview` })
useProductPageSeo(page.value)
</script>

<template>
  <AdminLayout>
    <header class="preview-header card">
      <div>
        <NuxtLink to="/admin/product-pages" class="back">← Alle productpagina's</NuxtLink>
        <h1>{{ page?.title }}</h1>
        <p class="preview-meta">
          <span
            class="preview-status"
            :class="page?.status === 'published' ? 'preview-status--live' : 'preview-status--draft'"
          >
            {{ page?.status === 'published' ? 'Gepubliceerd' : 'Concept — niet zichtbaar voor bezoekers' }}
          </span>
          · /{{ page?.slug }}
        </p>
      </div>
      <div class="preview-actions">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="regenerating"
          @click="regenerateContent"
        >
          {{ regenerating ? 'Genereren…' : 'Opnieuw genereren' }}
        </button>
        <NuxtLink
          v-if="page?.status === 'published'"
          class="btn btn-sm"
          :to="`/${page.slug}`"
          target="_blank"
        >
          Live bekijken
        </NuxtLink>
        <NuxtLink class="btn btn-secondary btn-sm" to="/admin/product-pages">
          Terug naar overzicht
        </NuxtLink>
      </div>
    </header>

    <p v-if="regenerateError" class="preview-feedback preview-feedback--error" role="alert">
      {{ regenerateError }}
    </p>
    <p v-if="regenerateMessage" class="preview-feedback preview-feedback--success" role="status">
      {{ regenerateMessage }}
    </p>

    <div class="preview-frame card">
      <ProductPageRenderer v-if="page" :page="page" />
    </div>
  </AdminLayout>
</template>

<style scoped>
.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.preview-header h1 {
  margin: 0.35rem 0;
}

.back {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--color-muted);
  text-decoration: none;
}

.preview-meta {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.preview-status {
  font-weight: 600;
}

.preview-status--draft {
  color: #92400e;
}

.preview-status--live {
  color: #166534;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview-frame {
  max-width: 800px;
  margin: 0 auto;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
}

.preview-feedback {
  margin: 0 0 1rem;
}

.preview-feedback--error {
  color: #b91c1c;
}

.preview-feedback--success {
  color: var(--color-primary);
}
</style>
