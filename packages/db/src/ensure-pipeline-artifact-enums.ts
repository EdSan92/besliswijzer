import { sql } from 'drizzle-orm'
import type { Database } from './index.js'

const PIPELINE_ARTIFACT_KIND_VALUES = ['publish_record', 'review_record'] as const

export async function ensurePipelineArtifactEnums(db: Database): Promise<void> {
  for (const value of PIPELINE_ARTIFACT_KIND_VALUES) {
    await db.execute(
      sql.raw(`ALTER TYPE "pipeline_artifact_kind" ADD VALUE IF NOT EXISTS '${value}'`),
    )
  }
}
