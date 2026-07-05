import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createDb } from '@besliswijzer/db'
import { flowImportRequestSchema } from '@besliswijzer/flow-schema'
import { importFlowDefinition } from '../services/flow-import-export-service.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../.env') })

function usage() {
  console.log(`Usage: pnpm flow:import <file.json> [--publish] [--overwrite]

Imports a portable flow JSON into the database (uses DATABASE_URL from .env).

Options:
  --publish     Publish immediately after import
  --overwrite   Replace draft when slug already exists
`)
}

async function main() {
  const args = process.argv.slice(2)
  const fileArg = args.find((arg) => !arg.startsWith('--'))
  if (!fileArg) {
    usage()
    process.exit(1)
  }

  const publish = args.includes('--publish')
  const overwrite = args.includes('--overwrite')
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('DATABASE_URL is missing. Set it in .env or the environment.')
    process.exit(1)
  }

  const filePath = resolve(__dirname, '../../../../', fileArg)
  const raw = readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  const payload =
    parsed && typeof parsed === 'object' && 'flow' in parsed
      ? flowImportRequestSchema.parse(parsed)
      : flowImportRequestSchema.parse({ publish, overwrite, flow: parsed })

  if (!('flow' in (parsed as object))) {
    payload.publish = publish
    payload.overwrite = overwrite
  }

  const { db, client } = createDb(connectionString)

  try {
    const result = await importFlowDefinition(db, payload)
    console.log(
      JSON.stringify(
        {
          ok: true,
          ...result,
        },
        null,
        2,
      ),
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
