import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

export * from './schema.js'
export { DrizzlePipelineRunStore } from './pipeline-run-store.js'
export { verifyMigration0006, type Migration0006Verification } from './verify-migration-0006.js'

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10 })
  const db = drizzle(client, { schema })
  return { db, client }
}

export type Database = ReturnType<typeof createDb>['db']
