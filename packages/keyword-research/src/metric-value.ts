import { z } from 'zod'

export const metricValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('known'),
    value: z.number().nonnegative(),
  }),
  z.object({
    kind: z.literal('unknown'),
    reason: z.string().optional(),
  }),
])

export type MetricValue = z.infer<typeof metricValueSchema>

export function knownMetric(value: number): MetricValue {
  return { kind: 'known', value }
}

export function unknownMetric(reason?: string): MetricValue {
  return reason ? { kind: 'unknown', reason } : { kind: 'unknown' }
}

export function toMetricValue(value: number | undefined, reason = 'not reported by provider'): MetricValue {
  if (value === undefined || Number.isNaN(value)) {
    return unknownMetric(reason)
  }
  return knownMetric(value)
}
