import { getBackendAdminHeaders, isAdminAuthenticated } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  if (!isAdminAuthenticated(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Niet ingelogd' })
  }

  const config = useRuntimeConfig()
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const target = `${config.public.apiBase}/api/v1/admin/${path}${queryString ? `?${queryString}` : ''}`

  const method = event.method
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(method)
  const body = hasBody ? await readBody(event).catch(() => undefined) : undefined

  return $fetch(target, {
    method,
    body,
    headers: getBackendAdminHeaders(config),
    responseType: path.endsWith('/leads') ? 'text' : 'json',
  })
})
