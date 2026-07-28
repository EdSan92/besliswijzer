<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

type PipelineRunSummary = {
  id: string
  categorySlug: string
  language: string
  status: string
  pipelineVersion: string
  inputVersion: string
  updatedAt: string
  artifactKinds: string[]
}

const statusFilter = ref<string>('all')
const message = ref('')
const errorMessage = ref('')

const { data, error, refresh, pending } = await useAsyncData('admin-pipeline-runs', () =>
  useAdminFetch<{ runs: PipelineRunSummary[] }>('/api/v1/admin/pipeline-runs'),
)

const runs = computed(() => data.value?.runs ?? [])

const filteredRuns = computed(() => {
  if (statusFilter.value === 'all') return runs.value
  return runs.value.filter((run) => run.status === statusFilter.value)
})

function formatDate(value: string) {
  return new Date(value).toLocaleString('nl-NL')
}

function statusLabel(status: string) {
  switch (status) {
    case 'needs_review':
      return 'Review nodig'
    case 'approved':
      return 'Goedgekeurd'
    case 'published':
      return 'Gepubliceerd'
    case 'failed':
      return 'Mislukt'
    case 'running':
      return 'Bezig'
    default:
      return status
  }
}
</script>

<template>
  <AdminLayout>
    <div class="page">
      <header class="header">
        <div>
          <h1>Pipeline runs</h1>
          <p>Review AI-gegenereerde content voordat deze wordt gepubliceerd.</p>
        </div>
      </header>

      <p v-if="error" class="error">{{ error.message }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="message" class="message">{{ message }}</p>

      <div class="toolbar">
        <label>
          Status
          <select v-model="statusFilter" @change="refresh()">
            <option value="all">Alle</option>
            <option value="needs_review">Review nodig</option>
            <option value="approved">Goedgekeurd</option>
            <option value="published">Gepubliceerd</option>
            <option value="failed">Mislukt</option>
          </select>
        </label>
        <button type="button" :disabled="pending" @click="refresh()">Vernieuwen</button>
      </div>

      <table v-if="filteredRuns.length" class="table">
        <thead>
          <tr>
            <th>Categorie</th>
            <th>Status</th>
            <th>Inputversie</th>
            <th>Artefacten</th>
            <th>Bijgewerkt</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="run in filteredRuns" :key="run.id">
            <td>{{ run.categorySlug }} ({{ run.language }})</td>
            <td><span class="badge">{{ statusLabel(run.status) }}</span></td>
            <td>{{ run.inputVersion }}</td>
            <td>{{ run.artifactKinds.join(', ') }}</td>
            <td>{{ formatDate(run.updatedAt) }}</td>
            <td>
              <NuxtLink :to="`/admin/pipeline-runs/${run.id}`">Open</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">Geen pipeline runs gevonden.</p>
    </div>
  </AdminLayout>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.toolbar {
  display: flex;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #eef2ff;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}

.message {
  color: #166534;
}

.empty {
  color: #6b7280;
}
</style>
