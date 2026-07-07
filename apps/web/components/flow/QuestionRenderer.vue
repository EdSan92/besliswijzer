<script setup lang="ts">
import type { FlowNode, FlowResult } from '@besliswijzer/flow-schema'

const props = defineProps<{
  node: FlowNode
  modelValue?: unknown
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  submit: [value: unknown]
}>()

const localValue = ref(props.modelValue)

const canSubmit = computed(() => {
  if (props.node.type === 'lead_capture' || props.node.type === 'info') {
    return true
  }

  const inputType = props.node.content.inputType ?? (props.node.options.length ? 'single' : undefined)

  if (inputType === 'single') {
    return localValue.value !== null && localValue.value !== undefined && localValue.value !== ''
  }
  if (inputType === 'multi') {
    return Array.isArray(localValue.value) && localValue.value.length > 0
  }
  if (inputType === 'slider') {
    return typeof localValue.value === 'number'
  }
  if (inputType === 'text') {
    return typeof localValue.value === 'string' && localValue.value.trim().length > 0
  }

  return true
})

watch(
  () => props.modelValue,
  (val) => {
    localValue.value = val
  },
)

function submit() {
  emit('submit', localValue.value ?? '')
}

function skipLead() {
  localValue.value = ''
  emit('submit', '')
}
</script>

<template>
  <div class="question-renderer">
    <h2>{{ node.title }}</h2>
    <p v-if="node.content.description" class="muted">{{ node.content.description }}</p>

    <FlowOptionSingle
      v-if="node.content.inputType === 'single' || (!node.content.inputType && node.options.length)"
      :options="node.options"
      v-model="localValue"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <FlowOptionMulti
      v-else-if="node.content.inputType === 'multi'"
      :options="node.options"
      v-model="localValue"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div v-else-if="node.content.inputType === 'slider'" class="slider-wrap">
      <input
        v-model.number="localValue"
        type="range"
        :min="node.content.min ?? 0"
        :max="node.content.max ?? 100"
        @input="emit('update:modelValue', localValue)"
      />
      <strong>{{ localValue ?? node.content.min ?? 0 }} m²</strong>
    </div>

    <div v-else-if="node.content.inputType === 'text' || node.type === 'lead_capture'" class="lead-capture">
      <input
        v-model="localValue"
        :type="node.type === 'lead_capture' ? 'email' : 'text'"
        :placeholder="node.content.placeholder ?? (node.type === 'lead_capture' ? 'jouw@email.nl' : '')"
        class="text-input"
        @input="emit('update:modelValue', localValue)"
      />
    </div>

    <div v-else-if="node.type === 'info'" class="info-block">
      <p>{{ node.content.description }}</p>
    </div>

    <div v-if="node.type === 'lead_capture'" class="action-row">
      <button class="btn" type="button" :disabled="props.submitting" @click="submit">Bekijk advies</button>
      <button class="btn btn-secondary" type="button" :disabled="props.submitting" @click="skipLead">Overslaan</button>
    </div>
    <p v-if="node.type === 'lead_capture'" class="hint">E-mail is optioneel.</p>
    <button
      v-else
      class="btn"
      style="margin-top: 1.5rem"
      type="button"
      :disabled="!canSubmit"
      @click="submit"
    >
      Volgende
    </button>
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-muted);
}

.slider-wrap {
  display: grid;
  gap: 0.75rem;
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font: inherit;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.lead-capture {
  margin-top: 0.25rem;
}

.info-block {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.hint {
  margin: 0.75rem 0 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}
</style>
