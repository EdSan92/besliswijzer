import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

// Monorepo: .env staat in de projectroot, niet in apps/web (zoals bij de API).
loadEnv({ path: resolve(__dirname, '../../.env') })

export default defineNuxtConfig({
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    geminiApiKey:
      process.env.NUXT_GEMINI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      '',
    adminApiKey:
      process.env.NUXT_ADMIN_API_KEY ??
      process.env.ADMIN_API_KEY ??
      'dev-admin-key',
    opportunityApiBase:
      process.env.NUXT_OPPORTUNITY_API_BASE ??
      process.env.OPPORTUNITY_API_BASE ??
      'http://localhost:3002',
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ??
        (process.env.NODE_ENV === 'production'
          ? 'https://besliswijzerapi-production.up.railway.app'
          : 'http://localhost:3001'),
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
    // Geen brede /api devProxy — die overschrijft Nuxt server routes zoals /api/gemini/chat.
    // Publieke en admin API's lopen al via server/api/v1/public en server/api/admin handlers.
  },
})
