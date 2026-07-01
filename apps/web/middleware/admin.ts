export default defineNuxtRouteMiddleware((to) => {
  if (process.dev) return

  const adminSession = useCookie('admin_session')
  if (!adminSession.value && to.path !== '/admin/login') {
    return navigateTo('/admin/login')
  }
})
