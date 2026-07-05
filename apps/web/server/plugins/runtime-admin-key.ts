export default defineNitroPlugin(() => {
  const key = process.env.NUXT_ADMIN_API_KEY || process.env.ADMIN_API_KEY
  if (!key) return

  const config = useRuntimeConfig()
  config.adminApiKey = key
})
