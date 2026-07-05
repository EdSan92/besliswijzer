import { getBackendAdminHeaders, setAdminSession } from '../../utils/admin-auth'
import { getAdminApiKey } from '../../utils/runtime-config'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<{ password?: string }>(event)
  const adminApiKey = getAdminApiKey(config.adminApiKey as string)

  if (!body?.password || body.password !== adminApiKey) {
    throw createError({ statusCode: 401, statusMessage: 'Onjuist wachtwoord' })
  }

  setAdminSession(event)
  return { ok: true }
})
