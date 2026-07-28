import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/flow-schema',
  'packages/flow-compiler',
  'packages/pipeline-quality',
  'packages/pipeline-schema',
  'packages/flow-engine',
  'apps/opportunity-engine',
  'apps/api',
  'apps/web',
])
