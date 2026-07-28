<script setup lang="ts">
import {
  formatArtifactPayload,
  getLatestCorrectableArtifacts,
  groupArtifactsByKind,
  isCorrectableArtifactKind,
  parseArtifactCorrectionJson,
  type CorrectableArtifactKind,
} from '~/utils/pipeline-artifact-correction'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const runId = computed(() => String(route.params.id))

type QualityFinding = {
  ruleCode: string
  severity: string
  field: string
  message: string
}

type ArtifactDiffEntry = {
  path: string
  before: unknown
  after: unknown
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
  corrections: Array<{ kind: string; diff: ArtifactDiffEntry[] }>
}

const message = ref('')
const errorMessage = ref('')
const rejectReason = ref('')
const actor = ref('admin')
const correctionReason = ref('')
const savingKind = ref<CorrectableArtifactKind | null>(null)
const editDrafts = ref<Record<string, string>>({})
const clientValidationErrors = ref<Record<string, string>>({})

const { data, error, refresh, pending } = await useAsyncData(
  () => `admin-pipeline-run-${runId.value}`,
  () => useAdminFetch<PipelineRunDetail>(`/api/v1/admin/pipeline-runs/${runId.value}`),
)

const blockingFindings = computed(() =>
  (data.value?.qualityReport.findings ?? []).filter((finding) => finding.severity === 'error'),
)

const canCorrect = computed(() => data.value?.run.status === 'needs_review')

const correctableArtifacts = computed(() =>
  getLatestCorrectableArtifacts(data.value?.run.artifacts ?? []),
)

const artifactsByKind = computed(() =>
  groupArtifactsByKind(data.value?.run.artifacts ?? []),
)

watch(
  correctableArtifacts,
  (artifacts) => {
    for (const artifact of artifacts) {
      if (!editDrafts.value[artifact.kind]) {
        editDrafts.value[artifact.kind] = formatArtifactPayload(artifact.payload)
      }
    }
  },
  { immediate: true },
)

function resetDraft(kind: string) {
  const versions = artifactsByKind.value.get(kind)
  const latest = versions?.[versions.length - 1]
  if (latest) {
    editDrafts.value[kind] = formatArtifactPayload(latest.payload)
    clientValidationErrors.value[kind] = ''
  }
}

async function saveCorrection(kind: CorrectableArtifactKind) {
  errorMessage.value = ''
  message.value = ''
  clientValidationErrors.value[kind] = ''

  const parsed = parseArtifactCorrectionJson(editDrafts.value[kind] ?? '')
  if (!parsed.ok) {
    clientValidationErrors.value[kind] = parsed.error
    return
  }

  savingKind.value = kind
  try {
    await useAdminFetch(`/api/v1/admin/pipeline-runs/${runId.value}/artifacts`, {
      method: 'PATCH',
      body: {
        kind,
        payload: parsed.payload,
        actor: actor.value,
        reason: correctionReason.value.trim() || undefined,
      },
    })
    message.value = `${kind} gecorrigeerd.`
    correctionReason.value = ''
    editDrafts.value[kind] = ''
    await refresh()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Opslaan mislukt'
  } finally {
    savingKind.value = null
  }
}

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

function formatDiffValue(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <AdminLayout>
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

        <section v-if="canCorrect && correctableArtifacts.length" class="card">
          <h2>Artefactcorrectie</h2>
          <p class="hint">Pas ondersteunde artefacten aan. Ongeldige JSON of schema-fouten worden niet opgeslagen.</p>

          <label class="field">
            Actor
            <input v-model="actor" type="text">
          </label>
          <label class="field">
            Reden (optioneel)
            <input v-model="correctionReason" type="text" placeholder="Waarom pas je dit artefact aan?">
          </label>

          <article
            v-for="artifact in correctableArtifacts"
            :key="artifact.id"
            class="editor"
          >
            <header class="editor-header">
              <h3>{{ artifact.kind }} · v{{ artifact.version }}</h3>
              <button type="button" class="secondary" @click="resetDraft(artifact.kind)">
                Herstel origineel
              </button>
            </header>

            <label class="field">
              Payload (JSON)
              <textarea
                v-model="editDrafts[artifact.kind]"
                rows="14"
                spellcheck="false"
              />
            </label>

            <p v-if="clientValidationErrors[artifact.kind]" class="error">
              {{ clientValidationErrors[artifact.kind] }}
            </p>

            <button
              type="button"
              :disabled="savingKind === artifact.kind"
              @click="saveCorrection(artifact.kind as CorrectableArtifactKind)"
            >
              {{ savingKind === artifact.kind ? 'Opslaan…' : 'Correctie opslaan' }}
            </button>

            <details v-if="(artifactsByKind.get(artifact.kind)?.length ?? 0) > 1" class="history">
              <summary>Versiegeschiedenis ({{ artifactsByKind.get(artifact.kind)?.length }})</summary>
              <details
                v-for="version in artifactsByKind.get(artifact.kind)"
                :key="version.id"
                class="history-item"
              >
                <summary>v{{ version.version }}</summary>
                <pre>{{ formatArtifactPayload(version.payload) }}</pre>
              </details>
            </details>
          </article>
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
          <h2>Alle artefacten</h2>
          <details v-for="artifact in data.run.artifacts" :key="artifact.id">
            <summary>
              {{ artifact.kind }} v{{ artifact.version }}
              <span v-if="isCorrectableArtifactKind(artifact.kind)" class="tag">corrigeerbaar</span>
            </summary>
            <pre>{{ formatArtifactPayload(artifact.payload) }}</pre>
          </details>
        </section>

        <section v-if="data.corrections.length" class="card">
          <h2>Correctiediffs</h2>
          <div v-for="correction in data.corrections" :key="correction.kind">
            <h3>{{ correction.kind }}</h3>
            <table class="diff-table">
              <thead>
                <tr>
                  <th>Pad</th>
                  <th>Was</th>
                  <th>Wordt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entry, index) in correction.diff" :key="index">
                  <td>{{ entry.path }}</td>
                  <td><pre>{{ formatDiffValue(entry.before) }}</pre></td>
                  <td><pre>{{ formatDiffValue(entry.after) }}</pre></td>
                </tr>
              </tbody>
            </table>
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
          <div class="row">
            <button type="button" :disabled="blockingFindings.length > 0" @click="approveRun">
              Goedkeuren
            </button>
            <span v-if="blockingFindings.length" class="hint">Goedkeuren geblokkeerd door kwaliteitsfouten.</span>
          </div>
          <label class="field">
            Afwijzingsreden
            <textarea v-model="rejectReason" rows="3" />
          </label>
          <button type="button" class="danger" @click="rejectRun">Afwijzen</button>
        </section>
      </template>
    </div>
  </AdminLayout>
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

.editor {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
  margin-top: 1rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.field {
  display: block;
  margin-bottom: 0.75rem;
}

.field input,
.field textarea {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
}

.actions .row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

pre {
  overflow: auto;
  max-height: 320px;
  font-size: 0.8rem;
  white-space: pre-wrap;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.diff-table th,
.diff-table td {
  vertical-align: top;
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.secondary {
  background: #f3f4f6;
}

.tag {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #4b5563;
}

.history {
  margin-top: 0.75rem;
}

.history-item {
  margin-top: 0.5rem;
}

.error { color: #b91c1c; }
.message { color: #166534; }
.hint { color: #6b7280; font-size: 0.875rem; }
.danger { background: #fee2e2; }
.back-link { color: #2563eb; }
</style>
