import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from '../index.js'
import { ensurePipelineArtifactEnums } from '../ensure-pipeline-artifact-enums.js'
import { verifyMigration0006 } from '../verify-migration-0006.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

async function main() {
  const { db, client } = createDb(connectionString)
  try {
    await ensurePipelineArtifactEnums(db)
    const result = await verifyMigration0006(db)
    console.log(result.message)
    if (!result.ok) {
      process.exitCode = 1
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
