import { CONTENT_PACKAGE_PROMPT_VERSION } from './artifact.js'

export type ContentPackageConfig = {
  promptVersion: string
  provider: string
  model: string
}

export function readContentPackageConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ContentPackageConfig {
  return {
    promptVersion: env.CONTENT_PACKAGE_PROMPT_VERSION ?? CONTENT_PACKAGE_PROMPT_VERSION,
    provider: env.CONTENT_PACKAGE_MODEL_PROVIDER ?? 'gemini',
    model: env.CONTENT_PACKAGE_MODEL_NAME ?? 'gemini-3.1-flash-lite',
  }
}
