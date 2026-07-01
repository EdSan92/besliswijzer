import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://decision:decision@localhost:5432/besliswijzer'

async function main() {
  const { db, client } = createDb(connectionString)
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') })
  console.log('Migrations complete')
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
