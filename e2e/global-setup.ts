import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')

export default async function globalSetup() {
  if (process.env.E2E_SKIP_DB_PREP === 'true') {
    console.log('E2E: database prep overgeslagen (E2E_SKIP_DB_PREP=true)')
    return
  }

  console.log('E2E: database migreren en seeden…')

  try {
    execSync('pnpm db:migrate', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    })
    execSync('pnpm db:seed', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    })
    console.log('E2E: database klaar')
  } catch (error) {
    console.warn(
      'E2E: database prep mislukt — zorg dat Postgres draait (docker compose up -d postgres) en DATABASE_URL klopt.',
    )
    console.warn(error)
  }
}
