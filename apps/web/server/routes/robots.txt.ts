import { buildRobotsTxt } from '../utils/sitemap'

export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host ?? 'localhost:3000'}`
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return buildRobotsTxt(baseUrl)
})
