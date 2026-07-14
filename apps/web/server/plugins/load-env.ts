import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
loadEnv({ path: resolve(rootDir, '.env') })

export default defineNitroPlugin(() => {
  // Env wordt hier geladen zodat Nitro server routes process.env.GEMINI_API_KEY zien.
})
