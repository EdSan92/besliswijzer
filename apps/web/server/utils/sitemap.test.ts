import { describe, expect, it } from 'vitest'
import { buildSitemapXml, buildRobotsTxt } from './sitemap.js'

describe('sitemap helpers', () => {
  it('includes published product pages and flow routes', () => {
    const xml = buildSitemapXml('https://example.com', {
      productPages: ['robotstofzuiger-kiezen', 'mesh-wifi-kiezen'],
      flowSlugs: ['robotstofzuigers', 'mesh-wifi'],
      categorySlugs: ['tech-schoonmaak'],
    })

    expect(xml).toContain('<loc>https://example.com/robotstofzuiger-kiezen</loc>')
    expect(xml).toContain('<loc>https://example.com/mesh-wifi-kiezen</loc>')
    expect(xml).toContain('<loc>https://example.com/flows/mesh-wifi</loc>')
    expect(xml).toContain('<loc>https://example.com/categorie/tech-schoonmaak</loc>')
  })

  it('references the sitemap in robots.txt', () => {
    const robots = buildRobotsTxt('https://example.com')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
  })
})
