import { FetchError } from 'ofetch'
import { resolveApiBase } from '../../utils/api-base'
import { getBackendAdminHeaders, isAdminAuthenticated } from '../../utils/admin-auth'

export default defineEventHandler(async (event) => {
  if (!isAdminAuthenticated(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Niet ingelogd' })
  }

  const config = useRuntimeConfig()
  const apiBase = resolveApiBase(config.public.apiBase)
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const target = `${apiBase}/api/v1/admin/${path}${queryString ? `?${queryString}` : ''}`

  const method = event.method
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(method)
  const body = hasBody ? await readBody(event).catch(() => undefined) : undefined

  try {
    return await $fetch(target, {
      method,
      body,
      headers: getBackendAdminHeaders(config),
      responseType: path.endsWith('/leads') ? 'text' : 'json',
    })
  } catch (error) {
    if (error instanceof FetchError) {
      const statusCode = error.statusCode ?? 502
      const data = error.data
      const message =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `${error.statusMessage || 'Backend request failed'} (API: ${apiBase})`

      throw createError({
        statusCode,
        statusMessage: message,
        data,
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage:
        error instanceof Error
          ? `${error.message} (API: ${apiBase})`
          : `Kan API niet bereiken. Check NUXT_PUBLIC_API_BASE (nu: ${apiBase}).`,
    })
  }
})
