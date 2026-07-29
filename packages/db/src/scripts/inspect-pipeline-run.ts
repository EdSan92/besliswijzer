import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, DrizzlePipelineRunStore } from '../index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

const runId = process.argv[2]
if (!runId) {
  console.error('Usage: tsx inspect-pipeline-run.ts <runId>')
  process.exit(1)
}

async function main() {
  const { db, client } = createDb(process.env.DATABASE_URL!)
  const store = new DrizzlePipelineRunStore(db)
  const run = await store.findById(runId)
  console.log(
    JSON.stringify(
      {
        status: run?.status,
        steps: run?.steps?.map((step) => ({
          key: step.stepKey,
          status: step.status,
          error: step.error,
        })),
        errors: run?.errors,
        artifactKinds: run?.artifacts?.map((artifact) => artifact.kind),
      },
      null,
      2,
    ),
  )
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
