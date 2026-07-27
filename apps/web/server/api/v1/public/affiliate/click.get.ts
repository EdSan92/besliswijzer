import { resolveApiBase } from '~/utils/api-base'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const host = getRequestHeader(event, 'host')
  const apiBase = resolveApiBase(config.public.apiBase as string, host)
  const query = getQuery(event)
  const queryString = new URLSearchParams(query as Record<string, string>).toString()
  const target = `${apiBase}/api/v1/public/affiliate/click?${queryString}`

  const response = await fetch(target, { redirect: 'manual' })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (location) {
      return sendRedirect(event, location, response.status as 301 | 302 | 303 | 307 | 308)
    }
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'Affiliate link kon niet worden opgehaald',
    })
  }

  return sendRedirect(event, target, 302)
})
