import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = process.env.PLAYWRIGHT_WEB_PORT ?? '3100'
const API_PORT = process.env.PLAYWRIGHT_API_PORT ?? '3101'
const WEB_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${WEB_PORT}`
const API_URL = process.env.PLAYWRIGHT_API_URL ?? `http://127.0.0.1:${API_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @besliswijzer/api dev',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        API_PORT,
        API_HOST: '127.0.0.1',
        PORT: API_PORT,
      },
    },
    {
      command: `pnpm --filter @besliswijzer/web exec nuxt dev --host 127.0.0.1 --port ${WEB_PORT}`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        NUXT_PUBLIC_API_BASE: API_URL,
        PORT: WEB_PORT,
      },
    },
  ],
})
