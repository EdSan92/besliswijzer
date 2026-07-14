<script setup lang="ts">
import type { OpportunityFlowDefinition } from '~/types/opportunity-flow'
import {
  buildFlowEdges,
  findEntryNode,
  nodeTypeLabel,
  orderNodesByFlow,
} from '~/utils/opportunity-flow'

const props = defineProps<{
  flow: OpportunityFlowDefinition
  keyword?: string
}>()

const edges = computed(() => buildFlowEdges(props.flow.rules, props.flow.nodes))
const orderedNodes = computed(() => orderNodesByFlow(props.flow.nodes, edges.value))
const entryNode = computed(() => findEntryNode(props.flow.nodes))

function edgesFrom(nodeKey: string) {
  return edges.value.filter((edge) => edge.fromNodeKey === nodeKey)
}

function resultTitle(resultKey: string) {
  return props.flow.results.find((result) => result.resultKey === resultKey)?.title ?? resultKey
}
</script>

<template>
  <div class="flow-map">
    <header class="flow-map__header">
      <div>
        <h3 class="flow-map__title">{{ flow.title }}</h3>
        <p v-if="keyword" class="flow-map__keyword">Keyword: {{ keyword }}</p>
        <p class="flow-map__slug">/{{ flow.slug }}</p>
      </div>
      <div class="flow-map__counts">
        <span>{{ flow.nodes.length }} stappen</span>
        <span>{{ flow.rules.length }} routes</span>
        <span>{{ flow.results.length }} resultaten</span>
      </div>
    </header>

    <p v-if="flow.description" class="flow-map__description">{{ flow.description }}</p>

    <div v-if="flow.seoTitle || flow.seoDescription" class="flow-map__seo">
      <strong>SEO</strong>
      <p v-if="flow.seoTitle">{{ flow.seoTitle }}</p>
      <p v-if="flow.seoDescription" class="flow-map__seo-desc">{{ flow.seoDescription }}</p>
    </div>

    <section class="flow-map__section">
      <h4>Vragen &amp; stappen</h4>
      <ol class="flow-map__nodes">
        <li
          v-for="(node, index) in orderedNodes"
          :key="node.nodeKey"
          class="flow-map__node"
          :class="{ 'flow-map__node--entry': entryNode?.nodeKey === node.nodeKey }"
        >
          <div class="flow-map__node-head">
            <span class="flow-map__node-index">{{ index + 1 }}</span>
            <div>
              <strong>{{ node.title }}</strong>
              <span class="flow-map__node-meta">
                {{ node.nodeKey }} · {{ nodeTypeLabel(node.type) }}
                <template v-if="entryNode?.nodeKey === node.nodeKey"> · start</template>
              </span>
            </div>
          </div>

          <ul v-if="node.options?.length" class="flow-map__options">
            <li v-for="option in node.options" :key="option.value">
              <code>{{ option.value }}</code> — {{ option.label }}
            </li>
          </ul>

          <ul v-if="edgesFrom(node.nodeKey).length" class="flow-map__routes">
            <li v-for="(edge, edgeIndex) in edgesFrom(node.nodeKey)" :key="edgeIndex">
              <span class="flow-map__route-label">{{ edge.label }}</span>
              <span class="flow-map__route-arrow">→</span>
              <span v-if="edge.targetNodeKey" class="flow-map__route-target">
                {{ edge.targetNodeKey }}
              </span>
              <span v-else-if="edge.targetResultKey" class="flow-map__route-result">
                resultaat: {{ resultTitle(edge.targetResultKey) }}
              </span>
            </li>
          </ul>
        </li>
      </ol>
    </section>

    <section v-if="flow.results.length" class="flow-map__section">
      <h4>Resultaten</h4>
      <div class="flow-map__results">
        <article
          v-for="result in flow.results"
          :key="result.resultKey"
          class="flow-map__result"
        >
          <header>
            <strong>{{ result.title }}</strong>
            <span class="flow-map__result-key">{{ result.resultKey }}</span>
          </header>
          <p>{{ result.body }}</p>
          <a
            v-if="result.ctaUrl"
            :href="result.ctaUrl"
            class="flow-map__cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ result.ctaLabel ?? 'Bekijk aanbeveling' }}
          </a>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.flow-map {
  display: grid;
  gap: 1.25rem;
}

.flow-map__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.flow-map__title {
  margin: 0;
  font-size: 1.15rem;
}

.flow-map__keyword,
.flow-map__slug {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.flow-map__counts {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.flow-map__counts span {
  font-size: 0.75rem;
  background: #f1f5f9;
  color: var(--color-muted);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.flow-map__description {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.5;
}

.flow-map__seo {
  padding: 0.75rem 1rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  background: #fafafa;
  font-size: 0.9rem;
}

.flow-map__seo p {
  margin: 0.35rem 0 0;
}

.flow-map__seo-desc {
  color: var(--color-muted);
}

.flow-map__section h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.flow-map__nodes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.flow-map__node {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  background: #fff;
}

.flow-map__node--entry {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.flow-map__node-head {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.flow-map__node-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: #eff6ff;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}

.flow-map__node-meta {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.flow-map__options {
  margin: 0.65rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.flow-map__options code {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}

.flow-map__routes {
  margin: 0.65rem 0 0;
  padding: 0.55rem 0.65rem;
  list-style: none;
  background: #f8fafc;
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.82rem;
}

.flow-map__routes li + li {
  margin-top: 0.35rem;
}

.flow-map__route-label {
  font-weight: 600;
  color: #475569;
}

.flow-map__route-arrow {
  margin: 0 0.35rem;
  color: #94a3b8;
}

.flow-map__route-target {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
}

.flow-map__route-result {
  color: var(--color-success);
  font-weight: 600;
}

.flow-map__results {
  display: grid;
  gap: 0.75rem;
}

.flow-map__result {
  border: 1px solid #86efac;
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  background: #f0fdf4;
}

.flow-map__result header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.flow-map__result p {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.flow-map__result-key {
  font-size: 0.72rem;
  color: var(--color-muted);
  font-family: ui-monospace, monospace;
}

.flow-map__cta {
  display: inline-block;
  margin-top: 0.65rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}

.flow-map__cta:hover {
  text-decoration: underline;
}
</style>
