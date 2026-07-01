<script setup lang="ts">
import type { FlowOption } from '@besliswijzer/flow-schema'

defineProps<{
  options: FlowOption[]
}>()

const model = defineModel<unknown[]>({ default: () => [] })

function toggle(optionKey: string) {
  const current = [...(model.value ?? [])]
  const index = current.indexOf(optionKey)
  if (index >= 0) {
    current.splice(index, 1)
  } else {
    current.push(optionKey)
  }
  model.value = current
}
</script>

<template>
  <div class="option-grid">
    <button
      v-for="option in options"
      :key="option.optionKey"
      type="button"
      class="option-btn"
      :class="{ selected: (model ?? []).includes(option.optionKey) }"
      @click="toggle(option.optionKey)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
