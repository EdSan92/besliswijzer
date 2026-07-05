export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const apiBase = process.env.NUXT_PUBLIC_API_BASE
  if (apiBase) {
    config.public.apiBase = apiBase.replace(/\/$/, '')
  }

  const key = process.env.NUXT_ADMIN_API_KEY || process.env.ADMIN_API_KEY
  if (key) {
    config.adminApiKey = key
  }
})
