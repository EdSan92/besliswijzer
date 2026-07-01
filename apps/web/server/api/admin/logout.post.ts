import { clearAdminSession } from '../../utils/admin-auth'

export default defineEventHandler((event) => {
  clearAdminSession(event)
  return { ok: true }
})
