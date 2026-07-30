import { describe, expect, it, vi } from 'vitest'
import { BesliswijzerCmsPublishProvider } from './besliswijzer-cms.provider.js'
import { PipelinePublishError } from '../errors.js'
import type { FlowDefinition } from '@besliswijzer/flow-schema'

const flow = {
  slug: 'airfryers',
  title: 'Airfryer keuzehulp',
  entryNode: 'start',
  nodes: [],
  rules: [],
  results: [],
} as unknown as FlowDefinition

describe('BesliswijzerCmsPublishProvider', () => {
  it('imports flows as draft via admin API', async () => {
    const calls: Array<{ url: string; method: string }> = []
    const fetchImpl = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET' })
      if (url.endsWith('/api/v1/admin/flows/import')) {
        return Response.json({ flowId: 'flow-1', slug: 'airfryers', published: false })
      }
      if (url.includes('/api/v1/admin/flows')) {
        return Response.json([{ slug: 'airfryers', publishedVersionNumber: 2 }])
      }
      return Response.json({})
    })

    const provider = new BesliswijzerCmsPublishProvider({
      apiBase: 'https://api.test',
      adminApiKey: 'admin-key',
      fetchImpl,
    })

    const result = await provider.upsertFlow({
      veraioId: 'airfryers:nl',
      locale: 'nl',
      slug: 'airfryers',
      flow,
      expectedVersion: 2,
      mode: 'draft',
    })

    expect(result.remoteId).toBe('flow-1')
    expect(calls.some((call) => call.url.endsWith('/flows/import') && call.method === 'POST')).toBe(
      true,
    )
  })

  it('maps auth failures to CMS_AUTH errors', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: 'Unauthorized' }, { status: 401 }))

    const provider = new BesliswijzerCmsPublishProvider({
      apiBase: 'https://api.test',
      adminApiKey: 'admin-key',
      fetchImpl,
      onMetrics: vi.fn(),
    })

    await expect(
      provider.upsertFlow({
        veraioId: 'airfryers:nl',
        locale: 'nl',
        slug: 'airfryers',
        flow,
        expectedVersion: null,
        mode: 'draft',
      }),
    ).rejects.toMatchObject({
      code: 'CMS_AUTH',
    } satisfies Partial<PipelinePublishError>)
  })

  it('maps missing product pages to CMS_NOT_FOUND errors', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ error: 'Not found' }, { status: 404 }))

    const provider = new BesliswijzerCmsPublishProvider({
      apiBase: 'https://api.test',
      adminApiKey: 'admin-key',
      fetchImpl,
      onMetrics: vi.fn(),
    })

    await expect(
      provider.upsertProductPage({
        veraioId: 'airfryers:nl',
        locale: 'nl',
        slug: 'missing-page',
        content: {
          slug: 'missing-page',
          intro: 'Intro',
          buyingGuide: 'Guide',
          faq: [],
          metadata: { title: 'Title', description: 'Desc' },
        },
        expectedVersion: null,
        mode: 'draft',
      }),
    ).rejects.toMatchObject({
      code: 'CMS_NOT_FOUND',
    } satisfies Partial<PipelinePublishError>)
  })
})
