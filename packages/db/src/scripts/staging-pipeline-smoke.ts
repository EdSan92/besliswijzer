import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { runPipelineStagingSmoke } from '@besliswijzer/pipeline-steps'
import { createDb, DrizzlePipelineRunStore } from '../index.js'
import { ensurePipelineArtifactEnums } from '../ensure-pipeline-artifact-enums.js'
import { verifyMigration0006 } from '../verify-migration-0006.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

const skipMigrate = process.argv.includes('--skip-migrate')

async function main() {
  const { db, client } = createDb(connectionString)

  try {
    if (!skipMigrate) {
      console.log('Running Drizzle migrations...')
      await migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') })
      console.log('Migrations complete.')
    }

    await ensurePipelineArtifactEnums(db)

    const migrationCheck = await verifyMigration0006(db)
    console.log(migrationCheck.message)
    if (!migrationCheck.ok) {
      process.exitCode = 1
      return
    }

    const store = new DrizzlePipelineRunStore(db)
    const suffix = new Date().toISOString().replace(/[:.]/g, '-')
    console.log(`Running pipeline staging smoke (suffix=${suffix})...`)

    const result = await runPipelineStagingSmoke({
      store,
      runSuffix: suffix,
    })

    console.log('Staging smoke checks:')
    for (const check of result.checks) {
      console.log(`  ✓ ${check}`)
    }
    console.log(`Primary run id: ${result.primaryRunId}`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
