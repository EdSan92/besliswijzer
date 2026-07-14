import { describe, expect, it } from 'vitest'
import { FlowStepTracker } from './flow-step-tracker.js'

describe('FlowStepTracker', () => {
  it('tracks start, complete and fail states', () => {
    const tracker = new FlowStepTracker()

    tracker.start('discover', 'Keywords verzamelen')
    tracker.complete('discover', '12 keywords')
    tracker.start('score', 'AI scoring')
    tracker.fail('score', 'API timeout')

    const steps = tracker.getSteps()
    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({
      id: 'discover',
      status: 'done',
      detail: '12 keywords',
    })
    expect(steps[1]).toMatchObject({
      id: 'score',
      status: 'error',
      detail: 'API timeout',
    })
    expect(steps[0]?.durationMs).toBeTypeOf('number')
  })
})
