import { buildRobotsTxt, buildSitemapXml } from '../utils/sitemap'
import { resolveApiBase } from '~/utils/api-base'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const host = getRequestHeader(event, 'host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host ?? 'localhost:3000'}`
  const apiBase = resolveApiBase(config.public.apiBase as string, host)

  const [pagesResponse, categoriesResponse] = await Promise.all([
    $fetch<{ pages: string[] }>(`${apiBase}/api/v1/public/pages`).catch(() => ({ pages: [] })),
    $fetch<{ categories: Array<{ slug: string; flows: Array<{ slug: string }> }> }>(
      `${apiBase}/api/v1/public/categories`,
    ).catch(() => ({ categories: [] })),
  ])

  const flowSlugs = categoriesResponse.categories.flatMap((category) =>
    category.flows.map((flow) => flow.slug),
  )

  const xml = buildSitemapXml(baseUrl, {
    productPages: pagesResponse.pages,
    flowSlugs,
    categorySlugs: categoriesResponse.categories.map((category) => category.slug),
  })

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
