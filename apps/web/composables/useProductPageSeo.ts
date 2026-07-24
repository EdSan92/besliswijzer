import type { PublicProductPageResponse } from '@besliswijzer/product-schema'

export function composeFaqSchema(page: PublicProductPageResponse) {
  const faqBlock = page.blocks.find((block) => block.type === 'faq')
  if (!faqBlock || faqBlock.type !== 'faq') return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqBlock.data.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function composeBreadcrumbSchema(page: PublicProductPageResponse, siteUrl: string) {
  const items: Array<{ name: string; item?: string }> = [
    { name: 'Home', item: siteUrl },
  ]

  if (page.product.categorySlug) {
    items.push({
      name: page.product.categorySlug,
      item: `${siteUrl}/categorie/${page.product.categorySlug}`,
    })
  }

  items.push({ name: page.title, item: `${siteUrl}/${page.slug}` })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  }
}

export function useProductPageSeo(page: PublicProductPageResponse) {
  const siteUrl = import.meta.client
    ? window.location.origin
    : `https://${useRequestHeaders()['host'] ?? 'localhost:3000'}`
  const schemas = [
    composeBreadcrumbSchema(page, siteUrl),
    composeFaqSchema(page),
  ].filter(Boolean)

  useSeoMeta({
    title: page.seo.title,
    description: page.seo.description,
    ogTitle: page.seo.title,
    ogDescription: page.seo.description,
    ogImage: page.seo.ogImage,
    twitterCard: page.seo.twitterCard ?? 'summary_large_image',
    robots: page.seo.noindex ? 'noindex' : undefined,
  })

  useHead({
    link: page.seo.canonicalUrl ? [{ rel: 'canonical', href: page.seo.canonicalUrl }] : [],
    script: schemas.map((schema) => ({
      type: 'application/ld+json',
      key: `ld-${schema!['@type']}`,
      innerHTML: JSON.stringify(schema),
    })),
  })
}
