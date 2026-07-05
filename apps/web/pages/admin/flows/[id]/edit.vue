<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const flowId = route.params.id as string

type NodeRecord = {
  id: string
  nodeKey: string
  type: string
  title: string
  content: Record<string, unknown>
  sortOrder: number
  isEntry: boolean
  options: Array<{ id: string; optionKey: string; label: string; value: unknown; sortOrder: number }>
}

type RuleRecord = {
  id: string
  fromNodeKey: string
  ruleType: string
  condition: Record<string, unknown>
  targetNodeKey: string | null
  targetResultKey: string | null
  priority: number
}

type ResultRecord = {
  id: string
  resultKey: string
  title: string
  body: Record<string, unknown>
  ctas: Array<{ id: string; type: string; url: string; label: string }>
}

type FlowDetail = {
  id: string
  slug: string
  title: string
  categoryId: string | null
  category: { id: string; slug: string; title: string } | null
  seoMeta: { title: string; description: string }
}

type CategoryItem = { id: string; slug: string; title: string }

const { data: flow, refresh: refreshFlow } = await useAsyncData(`admin-flow-${flowId}`, () =>
  useAdminFetch<FlowDetail>(`/api/v1/admin/flows/${flowId}`),
)

const { data: categories } = await useAsyncData('admin-categories-edit', () =>
  useAdminFetch<CategoryItem[]>('/api/v1/admin/categories'),
)

const selectedCategoryId = ref('')

const { data: nodes, refresh: refreshNodes } = await useAsyncData(`admin-nodes-${flowId}`, () =>
  useAdminFetch<NodeRecord[]>(`/api/v1/admin/flows/${flowId}/nodes`),
)

const { data: rules, refresh: refreshRules } = await useAsyncData(`admin-rules-${flowId}`, () =>
  useAdminFetch<RuleRecord[]>(`/api/v1/admin/flows/${flowId}/rules`),
)

const { data: results, refresh: refreshResults } = await useAsyncData(`admin-results-${flowId}`, () =>
  useAdminFetch<ResultRecord[]>(`/api/v1/admin/flows/${flowId}/results`),
)

const { data: analytics } = await useAsyncData(`admin-analytics-${flowId}`, () =>
  useAdminFetch<{
    starts: number
    completions: number
    completionRate: number
    dropOffByNode: Array<{ nodeKey: string; views: number; completes: number; dropOffRate: number }>
    ctaClicks: number
    leadSubmissions: number
  }>(`/api/v1/admin/flows/${flowId}/analytics`),
)

const newNode = reactive({
  nodeKey: '',
  title: '',
  type: 'question',
  inputType: 'single',
  isEntry: false,
})

const newRule = reactive({
  fromNodeKey: '',
  operator: 'equals',
  value: '',
  targetType: 'node' as 'node' | 'result',
  targetKey: '',
})

const publishing = ref(false)
const message = ref('')
const nodeKeyManual = ref(false)

const nodeOptions = computed(
  () => nodes.value?.map((n) => ({ key: n.nodeKey, label: `${n.nodeKey} — ${n.title}` })) ?? [],
)
const resultOptions = computed(
  () => results.value?.map((r) => ({ key: r.resultKey, label: `${r.resultKey} — ${r.title}` })) ?? [],
)

watch(
  () => flow.value?.categoryId,
  (id) => {
    selectedCategoryId.value = id ?? ''
  },
  { immediate: true },
)

async function saveCategory() {
  await useAdminFetch(`/api/v1/admin/flows/${flowId}`, {
    method: 'PATCH',
    body: { categoryId: selectedCategoryId.value || null },
  })
  message.value = 'Categorie opgeslagen'
  await refreshFlow()
}

watch(
  () => newNode.title,
  (title) => {
    if (!nodeKeyManual.value) {
      newNode.nodeKey = toSlug(title).replace(/-/g, '_')
    }
  },
)

watch(nodeOptions, (options) => {
  if (options.length && !newRule.fromNodeKey) {
    newRule.fromNodeKey = options[0]!.key
  }
  if (options.length && !newRule.targetKey && newRule.targetType === 'node') {
    newRule.targetKey = options[0]!.key
  }
})

watch(resultOptions, (options) => {
  if (options.length && !newRule.targetKey && newRule.targetType === 'result') {
    newRule.targetKey = options[0]!.key
  }
})

async function addNode() {
  await useAdminFetch(`/api/v1/admin/flows/${flowId}/nodes`, {
    method: 'POST',
    body: {
      nodeKey: newNode.nodeKey,
      title: newNode.title,
      type: newNode.type,
      content: { inputType: newNode.inputType },
      sortOrder: (nodes.value?.length ?? 0) + 1,
      isEntry: newNode.isEntry,
    },
  })
  newNode.nodeKey = ''
  newNode.title = ''
  await refreshNodes()
}

async function deleteNode(nodeId: string) {
  await useAdminFetch(`/api/v1/admin/flows/${flowId}/nodes/${nodeId}`, { method: 'DELETE' })
  await refreshNodes()
}

async function addOption(nodeId: string, optionKey: string, label: string, value: string) {
  await useAdminFetch(`/api/v1/admin/flows/${flowId}/nodes/${nodeId}/options`, {
    method: 'POST',
    body: { optionKey, label, value, sortOrder: 0 },
  })
  await refreshNodes()
}

async function addRule() {
  const opMap: Record<string, string> = {
    equals: '==',
    not_equals: '!=',
    gte: '>=',
    lte: '<=',
  }
  const op = opMap[newRule.operator] ?? '=='
  let parsedValue: unknown = newRule.value
  if (!Number.isNaN(Number(newRule.value))) parsedValue = Number(newRule.value)

  await useAdminFetch(`/api/v1/admin/flows/${flowId}/rules`, {
    method: 'POST',
    body: {
      fromNodeKey: newRule.fromNodeKey,
      ruleType: newRule.targetType === 'result' ? 'result_map' : 'branch',
      condition: { [op]: [{ var: `answers.${newRule.fromNodeKey}` }, parsedValue] },
      targetNodeKey: newRule.targetType === 'node' ? newRule.targetKey : null,
      targetResultKey: newRule.targetType === 'result' ? newRule.targetKey : null,
      priority: newRule.targetType === 'result' ? 100 : 10,
    },
  })
  await refreshRules()
}

async function publish() {
  publishing.value = true
  message.value = ''
  try {
    const result = await useAdminFetch<{ versionNumber: number }>(
      `/api/v1/admin/flows/${flowId}/publish`,
      { method: 'POST' },
    )
    message.value = `Gepubliceerd als v${result.versionNumber}`
    await refreshFlow()
  } catch {
    message.value = 'Publiceren mislukt'
  } finally {
    publishing.value = false
  }
}

async function downloadLeads() {
  const csv = await useAdminFetch<string>(`/api/v1/admin/flows/${flowId}/leads`)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${flow?.value?.slug ?? flowId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const importJson = ref('')
const importPublish = ref(false)
const importing = ref(false)

async function exportFlowJson() {
  const definition = await useAdminFetch<Record<string, unknown>>(`/api/v1/admin/flows/${flowId}/export`)
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${flow?.value?.slug ?? flowId}.json`
  a.click()
  URL.revokeObjectURL(url)
}

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

async function importDraft() {
  importing.value = true
  message.value = ''
  try {
    const parsed = JSON.parse(importJson.value) as { flow?: Record<string, unknown> }
    const flowPayload = parsed.flow ?? parsed
    const result = await useAdminFetch<{ versionNumber: number | null; published: boolean }>(
      `/api/v1/admin/flows/${flowId}/import`,
      {
        method: 'POST',
        body: { publish: importPublish.value, flow: flowPayload },
      },
    )
    message.value = result.published
      ? `Draft vervangen en gepubliceerd als v${result.versionNumber}`
      : 'Draft vervangen vanuit JSON'
    importJson.value = ''
    await Promise.all([refreshNodes(), refreshRules(), refreshResults(), refreshFlow()])
  } catch {
    message.value = 'Import mislukt — controleer je JSON'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <template #nav>
      <NuxtLink :to="`/admin/flows/${flowId}/preview`">Preview</NuxtLink>
      <NuxtLink v-if="flow" :to="`/flows/${flow.slug}`" target="_blank">Live</NuxtLink>
    </template>

    <header class="page-header">
      <div>
        <NuxtLink to="/admin" class="back-link">← Alle flows</NuxtLink>
        <h1>{{ flow?.title }}</h1>
        <p class="slug">/flows/{{ flow?.slug }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" type="button" @click="exportFlowJson">Export JSON</button>
        <button class="btn btn-secondary" type="button" @click="downloadLeads">Leads export</button>
        <button class="btn" type="button" :disabled="publishing" @click="publish">
          {{ publishing ? 'Publiceren…' : 'Publiceren' }}
        </button>
      </div>
    </header>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="card category-bar">
      <label>Categorie</label>
      <div class="category-row">
        <select v-model="selectedCategoryId">
          <option value="">Geen categorie</option>
          <option v-for="cat in categories ?? []" :key="cat.id" :value="cat.id">
            {{ cat.title }}
          </option>
        </select>
        <button class="btn btn-secondary btn-sm" type="button" @click="saveCategory">Opslaan</button>
      </div>
    </div>

    <section class="section card import-section">
      <h2>JSON import / export</h2>
      <p class="hint">
        Exporteer de huidige draft, pas JSON aan (of laat mij een flow schrijven), en importeer terug.
      </p>
      <div class="import-row">
        <div class="form-group">
          <label>JSON-bestand</label>
          <input type="file" accept="application/json,.json" @change="loadImportFile" />
        </div>
        <label class="checkbox-row">
          <input v-model="importPublish" type="checkbox" />
          Direct publiceren na import
        </label>
        <button
          class="btn btn-secondary"
          type="button"
          :disabled="importing || !importJson.trim()"
          @click="importDraft"
        >
          {{ importing ? 'Importeren…' : 'Draft vervangen' }}
        </button>
      </div>
      <textarea v-model="importJson" rows="6" placeholder='Plak flow JSON (object "flow" of alleen de flow-definitie)' />
    </section>

    <section class="section">
      <h2>Analytics</h2>
      <div v-if="analytics" class="stats-grid">
        <div class="stat-card"><span>Starts</span><strong>{{ analytics.starts }}</strong></div>
        <div class="stat-card"><span>Afgerond</span><strong>{{ analytics.completions }}</strong></div>
        <div class="stat-card"><span>Conversie</span><strong>{{ analytics.completionRate }}%</strong></div>
        <div class="stat-card"><span>CTA kliks</span><strong>{{ analytics.ctaClicks }}</strong></div>
        <div class="stat-card"><span>Leads</span><strong>{{ analytics.leadSubmissions }}</strong></div>
      </div>
    </section>

    <section class="section">
      <h2>Vragen & stappen</h2>
      <form class="card" @submit.prevent="addNode">
        <div class="form-row">
          <div class="form-group">
            <label>Titel</label>
            <input v-model="newNode.title" placeholder="Wat voor woning heb je?" required />
          </div>
          <div class="form-group">
            <label>Key</label>
            <input
              v-model="newNode.nodeKey"
              placeholder="woningtype"
              required
              @input="nodeKeyManual = true"
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select v-model="newNode.type">
              <option value="question">Vraag</option>
              <option value="info">Info</option>
              <option value="lead_capture">E-mail (lead)</option>
            </select>
          </div>
          <div v-if="newNode.type === 'question'" class="form-group">
            <label>Invoer</label>
            <select v-model="newNode.inputType">
              <option value="single">Enkele keuze</option>
              <option value="multi">Meerdere keuzes</option>
              <option value="slider">Slider</option>
              <option value="text">Tekst</option>
            </select>
          </div>
          <label class="checkbox-label">
            <input v-model="newNode.isEntry" type="checkbox" />
            Startvraag
          </label>
        </div>
        <button class="btn" type="submit">Stap toevoegen</button>
      </form>

      <div v-for="node in nodes ?? []" :key="node.id" class="card node-card">
        <div class="node-header">
          <div>
            <strong>{{ node.title }}</strong>
            <span class="node-meta">{{ node.nodeKey }} · {{ node.type }}</span>
            <span v-if="node.isEntry" class="badge">Start</span>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" @click="deleteNode(node.id)">
            Verwijderen
          </button>
        </div>
        <ul v-if="node.options.length" class="option-list">
          <li v-for="opt in node.options" :key="opt.id">{{ opt.label }}</li>
        </ul>
        <form
          v-if="node.type === 'question'"
          class="inline-form"
          @submit.prevent="
            addOption(
              node.id,
              ($event.target as HTMLFormElement).optionKey.value,
              ($event.target as HTMLFormElement).label.value,
              ($event.target as HTMLFormElement).value.value,
            )
          "
        >
          <input name="label" placeholder="Optielabel" required />
          <input name="optionKey" placeholder="key" required />
          <input name="value" placeholder="waarde" required />
          <button class="btn btn-secondary btn-sm" type="submit">+ Optie</button>
        </form>
      </div>
    </section>

    <section class="section">
      <h2>Regels (branching)</h2>
      <form class="card" @submit.prevent="addRule">
        <p class="help">Als antwoord op een vraag voldoet aan een conditie → ga naar volgende stap of resultaat.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Na vraag</label>
            <select v-model="newRule.fromNodeKey" required>
              <option v-for="opt in nodeOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Operator</label>
            <select v-model="newRule.operator">
              <option value="equals">is gelijk aan</option>
              <option value="not_equals">is niet</option>
              <option value="gte">≥</option>
              <option value="lte">≤</option>
            </select>
          </div>
          <div class="form-group">
            <label>Waarde</label>
            <input v-model="newRule.value" placeholder="bijv. apartment" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ga naar</label>
            <select v-model="newRule.targetType">
              <option value="node">Volgende stap</option>
              <option value="result">Resultaat</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ newRule.targetType === 'node' ? 'Stap' : 'Resultaat' }}</label>
            <select v-model="newRule.targetKey" required>
              <option v-if="newRule.targetType === 'node'" v-for="opt in nodeOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
              <option v-else v-for="opt in resultOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <button class="btn" type="submit">Regel toevoegen</button>
      </form>
      <ul v-if="rules?.length" class="rule-list card">
        <li v-for="rule in rules" :key="rule.id">
          <strong>{{ rule.fromNodeKey }}</strong>
          → {{ rule.targetNodeKey || rule.targetResultKey }}
          <span class="rule-type">{{ rule.ruleType }}</span>
        </li>
      </ul>
    </section>

    <section v-if="results?.length" class="section">
      <h2>Resultaten</h2>
      <ul class="card result-list">
        <li v-for="result in results" :key="result.id">
          <strong>{{ result.title }}</strong>
          <span>{{ result.resultKey }}</span>
        </li>
      </ul>
    </section>
  </AdminLayout>
</template>

<style scoped>
.category-bar {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.category-row select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font: inherit;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.back-link {
  font-size: 0.875rem;
  color: var(--color-muted);
}

.slug {
  color: var(--color-muted);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.message {
  padding: 0.75rem 1rem;
  background: #ecfdf5;
  border-radius: 8px;
  color: #166534;
}

.section {
  margin-top: 2rem;
}

.import-section textarea {
  width: 100%;
  margin-top: 0.75rem;
  font: inherit;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  resize: vertical;
}

.import-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  align-self: end;
  padding-bottom: 0.5rem;
}

.node-card {
  margin-top: 1rem;
}

.node-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.node-meta {
  display: block;
  font-size: 0.875rem;
  color: var(--color-muted);
}

.badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.1rem 0.5rem;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 999px;
  font-size: 0.75rem;
}

.option-list {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
}

.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.inline-form input {
  flex: 1;
  min-width: 100px;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.help {
  color: var(--color-muted);
  font-size: 0.875rem;
  margin-top: 0;
}

.rule-list li,
.result-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.rule-type {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
}
</style>
