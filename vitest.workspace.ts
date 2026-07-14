import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/flow-schema',
  'packages/flow-engine',
  'apps/opportunity-engine',
  'apps/api',
  'apps/web',
])
