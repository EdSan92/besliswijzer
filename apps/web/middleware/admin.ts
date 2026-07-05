export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.dev) return
  if (to.path === '/admin/login') return

  const adminSession = useCookie('admin_session')
  if (!adminSession.value) {
    return navigateTo('/admin/login')
  }
})
