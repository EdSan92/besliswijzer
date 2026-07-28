import { sql } from 'drizzle-orm'
import type { Database } from './index.js'

export type Migration0006Verification = {
  ok: boolean
  message: string
}

export async function verifyMigration0006(db: Database): Promise<Migration0006Verification> {
  const rows = await db.execute<{ has_review_record: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum AS enum_value
      INNER JOIN pg_type AS enum_type ON enum_value.enumtypid = enum_type.oid
      WHERE enum_type.typname = 'pipeline_artifact_kind'
        AND enum_value.enumlabel = 'review_record'
    ) AS has_review_record
  `)

  const row = rows[0] as { has_review_record?: boolean | string } | undefined
  const hasReviewRecord =
    row?.has_review_record === true || row?.has_review_record === 't' || row?.has_review_record === 'true'

  if (!hasReviewRecord) {
    return {
      ok: false,
      message:
        'Migration 0006 is missing: pipeline_artifact_kind has no review_record value. Run pnpm db:migrate.',
    }
  }

  return {
    ok: true,
    message: 'Migration 0006 verified: pipeline_artifact_kind includes review_record.',
  }
}
