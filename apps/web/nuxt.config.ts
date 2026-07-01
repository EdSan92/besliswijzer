export default defineNuxtConfig({
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    adminApiKey: process.env.ADMIN_API_KEY ?? 'dev-admin-key',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3001',
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Besliswijzer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
