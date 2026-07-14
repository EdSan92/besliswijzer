import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { z } from 'zod'

loadEnv({ path: resolve(process.cwd(), '../../.env') })
loadEnv({ path: resolve(process.cwd(), '.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3002),
  OPPORTUNITY_PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
  GEMINI_FALLBACK_MODELS: z.string().default('gemini-3.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_CUSTOMER_ID: z.string().optional(),
  GOOGLE_ADS_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string().optional(),
  GOOGLE_KEYWORD_INSIGHT_MOCK: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  KEYWORD_API_MAX_RETRIES: z.coerce.number().default(3),
  KEYWORD_API_RATE_LIMIT_MS: z.coerce.number().default(1100),
  CRON_DISCOVERY_SCHEDULE: z.string().default('0 2 * * *'),
  CRON_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OPPORTUNITY_MIN_SCORE: z.coerce.number().default(60),
  DISCOVERY_AUTO_GENERATE_FLOWS: z.coerce.number().default(5),
  SCORE_BATCH_SIZE: z.coerce.number().default(15),
  SCORE_CACHE_TTL_DAYS: z.coerce.number().default(30),
})

export type AppConfig = z.infer<typeof envSchema>

let cached: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      throw new Error(`Invalid environment configuration: ${issues}`)
    }
    cached = {
      ...parsed.data,
      PORT: parsed.data.OPPORTUNITY_PORT ?? parsed.data.PORT,
    }
  }
  return cached
}

export function getGeminiModels(): string[] {
  const config = getConfig()
  return [config.GEMINI_MODEL, ...config.GEMINI_FALLBACK_MODELS.split(',').map((m) => m.trim())].filter(
    Boolean,
  )
}
