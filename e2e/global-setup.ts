import { execSync } from 'node:child_process'

const rootDir = process.cwd()

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
  } catch (error) {
    console.warn(
      'E2E: db:migrate mislukt — ga door met seed (database is waarschijnlijk al gemigreerd).',
    )
    console.warn(error)
  }

  try {
    execSync('pnpm db:seed', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    })
    console.log('E2E: database klaar')
  } catch (error) {
    console.warn(
      'E2E: db:seed mislukt — zorg dat Postgres draait (docker compose up -d postgres) en DATABASE_URL klopt.',
    )
    console.warn(error)
  }
}
