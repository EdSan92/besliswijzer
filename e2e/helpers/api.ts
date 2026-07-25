import type { APIRequestContext } from '@playwright/test'

const API_PORT = process.env.PLAYWRIGHT_API_PORT ?? '3101'

export const API_BASE = process.env.PLAYWRIGHT_API_URL ?? `http://127.0.0.1:${API_PORT}`

export async function isApiHealthy(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get(`${API_BASE}/health`, { timeout: 5_000 })
    return response.ok()
  } catch {
    return false
  }
}

export async function isFlowPublished(
  request: APIRequestContext,
  slug: string,
): Promise<boolean> {
  try {
    const response = await request.get(`${API_BASE}/api/v1/public/flows/${slug}`, {
      timeout: 10_000,
    })
    return response.ok()
  } catch {
    return false
  }
}

export async function isProductPagePublished(
  request: APIRequestContext,
  slug: string,
): Promise<boolean> {
  try {
    const response = await request.get(`${API_BASE}/api/v1/public/pages/${slug}`, {
      timeout: 10_000,
    })
    return response.ok()
  } catch {
    return false
  }
}
