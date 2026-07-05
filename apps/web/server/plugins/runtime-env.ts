import { resolveApiBase } from '../utils/api-base'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  config.public.apiBase = resolveApiBase(config.public.apiBase as string)

  const key = process.env.NUXT_ADMIN_API_KEY || process.env.ADMIN_API_KEY
  if (key) {
    config.adminApiKey = key
  }
})
