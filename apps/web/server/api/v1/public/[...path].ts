import { FetchError } from 'ofetch'
import { resolveApiBase } from '~/utils/api-base'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const host = getRequestHeader(event, 'host')
  const apiBase = resolveApiBase(config.public.apiBase as string, host)
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const target = `${apiBase}/api/v1/public/${path}${queryString ? `?${queryString}` : ''}`

  const method = event.method
  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(method)
  const body = hasBody ? await readBody(event).catch(() => undefined) : undefined

  try {
    return await $fetch(target, { method, body })
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

      throw createError({ statusCode, statusMessage: message, data })
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
