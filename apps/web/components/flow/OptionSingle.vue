<script setup lang="ts">
import type { FlowOption } from '@besliswijzer/flow-schema'

defineProps<{
  options: FlowOption[]
}>()

const model = defineModel<unknown>()
</script>

<template>
  <div class="option-grid">
    <button
      v-for="option in options"
      :key="option.optionKey"
      type="button"
      class="option-btn"
      :class="{ selected: model === option.optionKey || model === option.value }"
      @click="model = option.optionKey"
    >
      {{ option.label }}
    </button>
  </div>
</template>
