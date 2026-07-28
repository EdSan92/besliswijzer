import { describe, expect, it, vi } from 'vitest'
import { InMemoryPipelineRunStore } from '../in-memory-store.js'
import { createPipelineRun } from '../store.js'
import { PipelineOrchestrator } from './orchestrator.js'
import { PipelineStepExecutionError, type PipelineStepHandler } from './types.js'

function createTestRun(stepKeys: string[]) {
  return createPipelineRun({
    categorySlug: 'airfryers',
    language: 'nl',
    pipelineVersion: '1.0.0',
    inputVersion: 'test-1',
    stepKeys,
    now: '2026-07-28T12:00:00.000Z',
  })
}

describe('PipelineOrchestrator', () => {
  it('executes steps sequentially and checkpoints after each step', async () => {
    const store = new InMemoryPipelineRunStore()
    const calls: string[] = []
    const saveSpy = vi.spyOn(store, 'save')

    const handlers: PipelineStepHandler[] = [
      {
        stepKey: 'step_a',
        execute: async ({ input, stepIdempotencyKey }) => {
          calls.push(`a:${stepIdempotencyKey}`)
          return { output: { value: (input.seed as number) + 1 } }
        },
      },
      {
        stepKey: 'step_b',
        execute: async ({ input }) => {
          calls.push(`b:${(input as { value: number }).value}`)
          return { output: { value: (input as { value: number }).value + 1 } }
        },
      },
    ]

    const run = await store.save(createTestRun(['step_a', 'step_b']))
    const orchestrator = new PipelineOrchestrator({ store, handlers })

    const result = await orchestrator.start({ runId: run.id, initialInput: { seed: 1 } })

    expect(result.status).toBe('needs_review')
    expect(result.steps.every((step) => step.status === 'completed')).toBe(true)
    expect(result.steps[1]?.output).toEqual({ value: 3 })
    expect(calls).toEqual([
      'a:airfryers:nl:1.0.0:test-1:step_a',
      'b:2',
    ])
    expect(saveSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('skips completed steps on resume', async () => {
    const store = new InMemoryPipelineRunStore()
    let stepACalls = 0
    let stepBCalls = 0

    const failOnceHandlers: PipelineStepHandler[] = [
      {
        stepKey: 'step_a',
        execute: async () => {
          stepACalls += 1
          return { output: { done: true } }
        },
      },
      {
        stepKey: 'step_b',
        execute: async () => {
          stepBCalls += 1
          throw new PipelineStepExecutionError('boom', 'step_b', 'STEP_FAILED')
        },
      },
    ]

    const successHandlers: PipelineStepHandler[] = [
      {
        stepKey: 'step_a',
        execute: async () => {
          stepACalls += 1
          return { output: { done: true } }
        },
      },
      {
        stepKey: 'step_b',
        execute: async () => {
          stepBCalls += 1
          return { output: { done: true } }
        },
      },
    ]

    const run = await store.save(createTestRun(['step_a', 'step_b']))
    const failing = new PipelineOrchestrator({ store, handlers: failOnceHandlers })
    const failedRun = await failing.start({ runId: run.id, initialInput: {} })

    expect(failedRun.status).toBe('failed')
    expect(failedRun.steps[0]?.status).toBe('completed')
    expect(failedRun.steps[1]?.status).toBe('failed')
    expect(stepACalls).toBe(1)
    expect(stepBCalls).toBe(1)

    stepACalls = 0
    stepBCalls = 0

    const recovering = new PipelineOrchestrator({ store, handlers: successHandlers })
    const recovered = await recovering.retryStep({ runId: failedRun.id, stepKey: 'step_b' })

    expect(recovered.status).toBe('needs_review')
    expect(stepACalls).toBe(0)
    expect(stepBCalls).toBe(1)
    expect(recovered.steps[0]?.status).toBe('completed')
    expect(recovered.steps[1]?.status).toBe('completed')
  })

  it('records a normalized error when a step fails', async () => {
    const store = new InMemoryPipelineRunStore()
    const orchestrator = new PipelineOrchestrator({
      store,
      handlers: [
        {
          stepKey: 'step_a',
          execute: async () => {
            throw new Error('provider unavailable')
          },
        },
      ],
    })

    const run = await store.save(createTestRun(['step_a']))
    const result = await orchestrator.start({ runId: run.id })

    expect(result.status).toBe('failed')
    expect(result.steps[0]?.status).toBe('failed')
    expect(result.errors[0]?.code).toBe('STEP_FAILED')
    expect(result.errors[0]?.message).toContain('provider unavailable')
  })

  it('normalizes timeout failures', async () => {
    const store = new InMemoryPipelineRunStore()
    const orchestrator = new PipelineOrchestrator({
      store,
      handlers: [
        {
          stepKey: 'slow_step',
          timeoutMs: 20,
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 50))
            return { output: {} }
          },
        },
      ],
    })

    const run = await store.save(createTestRun(['slow_step']))
    const result = await orchestrator.start({ runId: run.id })

    expect(result.status).toBe('failed')
    expect(result.errors[0]?.code).toBe('STEP_TIMEOUT')
  })
})
