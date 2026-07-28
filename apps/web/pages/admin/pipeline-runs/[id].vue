<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const runId = computed(() => String(route.params.id))

type QualityFinding = {
  ruleCode: string
  severity: string
  field: string
  message: string
}

type PipelineRunDetail = {
  run: {
    id: string
    status: string
    categorySlug: string
    language: string
    artifacts: Array<{ id: string; kind: string; version: number; payload: Record<string, unknown> }>
    steps: Array<{ stepKey: string; status: string; errorMessage?: string | null }>
    sources: Array<{ label: string; url?: string; provider?: string }>
  }
  qualityReport: {
    score: number
    hasBlockingErrors: boolean
    findings: QualityFinding[]
  }
  reviewRecords: Array<{ action: string; actor: string; reason?: string; occurredAt: string }>
  corrections: Array<{ kind: string; diff: Array<{ path: string; before: unknown; after: unknown }> }>
}

const message = ref('')
const errorMessage = ref('')
const rejectReason = ref('')
const actor = ref('admin')

const { data, error, refresh, pending } = await useAsyncData(
  () => `admin-pipeline-run-${runId.value}`,
  () => useAdminFetch<PipelineRunDetail>(`/api/v1/admin/pipeline-runs/${runId.value}`),
)

const blockingFindings = computed(() =>
  (data.value?.qualityReport.findings ?? []).filter((finding) => finding.severity === 'error'),
)

async function approveRun() {
  errorMessage.value = ''
  message.value = ''
  try {
    await useAdminFetch(`/api/v1/admin/pipeline-runs/${runId.value}/approve`, {
      method: 'POST',
      body: { actor: actor.value },
    })
    message.value = 'Run goedgekeurd.'
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Goedkeuren mislukt'
  }
}

async function rejectRun() {
  errorMessage.value = ''
  message.value = ''
  if (!rejectReason.value.trim()) {
    errorMessage.value = 'Geef een reden op voor afwijzing.'
    return
  }

  try {
    await useAdminFetch(`/api/v1/admin/pipeline-runs/${runId.value}/reject`, {
      method: 'POST',
      body: { actor: actor.value, reason: rejectReason.value.trim() },
    })
    message.value = 'Run afgewezen.'
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Afwijzen mislukt'
  }
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>Pipeline run</h1>
        <p v-if="data">{{ data.run.categorySlug }} · {{ data.run.language }} · {{ data.run.status }}</p>
      </div>
      <NuxtLink to="/admin/pipeline-runs" class="back-link">← Overzicht</NuxtLink>
    </header>

    <p v-if="error" class="error">{{ error.message }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="pending">Laden…</p>

    <template v-if="data">
      <section class="card">
        <h2>Kwaliteitsrapport</h2>
        <p>Score: {{ data.qualityReport.score }} · Blokkerende fouten: {{ data.qualityReport.hasBlockingErrors ? 'ja' : 'nee' }}</p>
        <ul v-if="data.qualityReport.findings.length">
          <li v-for="(finding, index) in data.qualityReport.findings" :key="index">
            [{{ finding.severity }}] {{ finding.ruleCode }} — {{ finding.field }}: {{ finding.message }}
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Stappen</h2>
        <ul>
          <li v-for="step in data.run.steps" :key="step.stepKey">
            {{ step.stepKey }} — {{ step.status }}
            <span v-if="step.errorMessage"> ({{ step.errorMessage }})</span>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Artefacten</h2>
        <details v-for="artifact in data.run.artifacts" :key="artifact.id">
          <summary>{{ artifact.kind }} v{{ artifact.version }}</summary>
          <pre>{{ JSON.stringify(artifact.payload, null, 2) }}</pre>
        </details>
      </section>

      <section v-if="data.corrections.length" class="card">
        <h2>Correcties</h2>
        <div v-for="correction in data.corrections" :key="correction.kind">
          <h3>{{ correction.kind }}</h3>
          <ul>
            <li v-for="(entry, index) in correction.diff" :key="index">
              {{ entry.path }}
            </li>
          </ul>
        </div>
      </section>

      <section v-if="data.reviewRecords.length" class="card">
        <h2>Review-audit</h2>
        <ul>
          <li v-for="(record, index) in data.reviewRecords" :key="index">
            {{ record.action }} door {{ record.actor }} op {{ record.occurredAt }}
            <span v-if="record.reason"> — {{ record.reason }}</span>
          </li>
        </ul>
      </section>

      <section v-if="data.run.status === 'needs_review'" class="card actions">
        <h2>Reviewacties</h2>
        <label>
          Actor
          <input v-model="actor" type="text">
        </label>
        <div class="row">
          <button type="button" :disabled="blockingFindings.length > 0" @click="approveRun">
            Goedkeuren
          </button>
          <span v-if="blockingFindings.length" class="hint">Goedkeuren geblokkeerd door kwaliteitsfouten.</span>
        </div>
        <label>
          Afwijzingsreden
          <textarea v-model="rejectReason" rows="3" />
        </label>
        <button type="button" class="danger" @click="rejectRun">Afwijzen</button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.actions label {
  display: block;
  margin-bottom: 0.75rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

pre {
  overflow: auto;
  max-height: 320px;
  font-size: 0.8rem;
}

.error { color: #b91c1c; }
.message { color: #166534; }
.hint { color: #6b7280; font-size: 0.875rem; }
.danger { background: #fee2e2; }
.back-link { color: #2563eb; }
</style>
