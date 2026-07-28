import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/flow-schema',
  'packages/flow-compiler',
  'packages/pipeline-quality',
  'packages/pipeline-schema',
  'packages/keyword-research',
  'packages/flow-brief',
  'packages/content-package',
  'packages/pipeline-review',
  'packages/pipeline-steps',
  'packages/pipeline-publish',
  'packages/flow-engine',
  'apps/opportunity-engine',
  'apps/api',
  'apps/web',
])
