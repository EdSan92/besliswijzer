const COOKIE_NAME = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 30

export function isAdminAuthenticated(event: Parameters<typeof getCookie>[0]): boolean {
  if (process.dev) return true
  return Boolean(getCookie(event, COOKIE_NAME))
}

export function setAdminSession(event: Parameters<typeof setCookie>[0]) {
  setCookie(event, COOKIE_NAME, '1', {
    // Must be readable by client route middleware after login (not a secret — value is "1").
    httpOnly: false,
    secure: !process.dev,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export function clearAdminSession(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getBackendAdminHeaders(config: { adminApiKey: string }) {
  return { 'X-Admin-Key': config.adminApiKey }
}
