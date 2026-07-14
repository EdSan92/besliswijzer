import { FetchError } from 'ofetch'
import { resolveOpportunityApiBase } from '~/utils/api-base'
import { isAdminAuthenticated } from '../utils/admin-auth'

export default defineEventHandler(async (event) => {
  if (!isAdminAuthenticated(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Niet ingelogd' })
  }

  const config = useRuntimeConfig()
  const apiBase = resolveOpportunityApiBase(config.opportunityApiBase as string)
  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const target = `${apiBase}/api/${path}${queryString ? `?${queryString}` : ''}`

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
          : `${error.statusMessage || 'Opportunity Engine niet bereikbaar'} (API: ${apiBase})`

      throw createError({ statusCode, statusMessage: message, data })
    }

    throw createError({
      statusCode: 502,
      statusMessage:
        error instanceof Error
          ? `${error.message} (API: ${apiBase})`
          : `Kan Opportunity Engine niet bereiken (API: ${apiBase}).`,
    })
  }
})
