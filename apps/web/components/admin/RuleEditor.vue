<script setup lang="ts">
const props = defineProps<{
  field: string
  operator: string
  value: string
  targetType: 'node' | 'result'
  targetKey: string
}>()

const emit = defineEmits<{
  save: [condition: Record<string, unknown>, rule: Record<string, unknown>]
}>()

const operators: Record<string, string> = {
  equals: '==',
  not_equals: '!=',
  gte: '>=',
  lte: '<=',
  gt: '>',
  lt: '<',
}

function buildJsonLogic() {
  const op = operators[props.operator] ?? '=='
  let parsedValue: unknown = props.value
  if (!Number.isNaN(Number(props.value)) && props.value.trim() !== '') {
    parsedValue = Number(props.value)
  }

  const condition = { [op]: [{ var: `answers.${props.field}` }, parsedValue] }

  const rule = {
    fromNodeKey: props.field === '*' ? '*' : props.field,
    ruleType: props.targetType === 'result' ? 'result_map' : 'branch',
    condition,
    ...(props.targetType === 'node'
      ? { targetNodeKey: props.targetKey }
      : { targetResultKey: props.targetKey }),
    priority: props.targetType === 'result' ? 100 : 10,
  }

  emit('save', condition, rule)
}
</script>

<template>
  <div class="rule-editor card">
    <p>
      Als <strong>{{ field }}</strong>
      {{ operator }}
      <strong>{{ value }}</strong>
      → ga naar {{ targetType }} <strong>{{ targetKey }}</strong>
    </p>
    <button class="btn btn-secondary" @click="buildJsonLogic">Regel opslaan</button>
  </div>
</template>
