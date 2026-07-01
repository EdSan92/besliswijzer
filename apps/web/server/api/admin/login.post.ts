import { getBackendAdminHeaders, setAdminSession } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<{ password?: string }>(event)

  if (!body?.password || body.password !== config.adminApiKey) {
    throw createError({ statusCode: 401, statusMessage: 'Onjuist wachtwoord' })
  }

  setAdminSession(event)
  return { ok: true }
})
