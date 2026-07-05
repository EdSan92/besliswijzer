export function resolveApiBase(configApiBase?: string): string {
  const fromEnv = process.env.NUXT_PUBLIC_API_BASE?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const fromConfig = configApiBase?.trim().replace(/\/$/, '')
  if (fromConfig && fromConfig !== 'http://localhost:3001') return fromConfig

  return fromConfig || 'http://localhost:3001'
}
