import { z } from 'zod'

export const PUBLISH_RECORD_VERSION = '1.0.0' as const

export const publishRecordResourceSchema = z.object({
  type: z.enum(['flow', 'product_page']),
  remoteId: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'publish']),
  publishedAt: z.string().datetime(),
  artifactVersion: z.number().int().positive(),
})

export const publishRecordSchema = z.object({
  kind: z.literal('publish_record'),
  version: z.literal(PUBLISH_RECORD_VERSION),
  runId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  status: z.enum(['completed', 'partial']),
  flowPublished: z.boolean(),
  productPagePublished: z.boolean(),
  resources: z.array(publishRecordResourceSchema),
  publishedAt: z.string().datetime(),
})

export type PublishRecord = z.infer<typeof publishRecordSchema>
export type PublishRecordResource = z.infer<typeof publishRecordResourceSchema>

export type PublishPipelineRunResult = {
  runId: string
  idempotencyKey: string
  published: boolean
  alreadyPublished: boolean
  flow?: PublishRecordResource
  productPage?: PublishRecordResource
  record: PublishRecord
}

export function createPublishRecord(input: Omit<PublishRecord, 'kind' | 'version'>): PublishRecord {
  return publishRecordSchema.parse({
    kind: 'publish_record',
    version: PUBLISH_RECORD_VERSION,
    ...input,
  })
}
