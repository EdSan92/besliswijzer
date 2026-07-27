type SitemapInput = {
  productPages: string[]
  flowSlugs: string[]
  categorySlugs: string[]
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function urlEntry(baseUrl: string, path: string): string {
  return `<url><loc>${escapeXml(`${baseUrl}${path}`)}</loc></url>`
}

export function buildSitemapXml(baseUrl: string, input: SitemapInput): string {
  const paths = new Set<string>(['/'])
  for (const slug of input.productPages) paths.add(`/${slug}`)
  for (const slug of input.flowSlugs) paths.add(`/flows/${slug}`)
  for (const slug of input.categorySlugs) paths.add(`/categorie/${slug}`)

  const entries = [...paths].sort().map((path) => urlEntry(baseUrl.replace(/\/$/, ''), path))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('')
}

export function buildRobotsTxt(baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, '')
  return [`User-agent: *`, `Allow: /`, `Disallow: /admin`, ``, `Sitemap: ${origin}/sitemap.xml`, ''].join('\n')
}
