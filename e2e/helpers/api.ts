import type { APIRequestContext } from '@playwright/test'

export const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

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
