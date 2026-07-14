# Veraio Opportunity Engine

Modulaire AI Opportunity Engine voor het automatisch ontdekken van winstgevende productcategorieën en het genereren van keuzehulpen.

## Stack

- Express + TypeScript
- PostgreSQL + Prisma
- Google Gemini (verwisselbaar via `AIProvider` interface)
- Google Ads Keyword Planning API (Keyword Insight)
- Pino logging + node-cron scheduler

## Starten

```bash
# Vanuit monorepo root
pnpm install
pnpm --filter @veraio/opportunity-engine db:generate
pnpm --filter @veraio/opportunity-engine db:push
pnpm --filter @veraio/opportunity-engine db:seed
pnpm dev:opportunity
```

Service draait op `http://localhost:3002`.

## API

| Method | Endpoint | Beschrijving |
|--------|----------|--------------|
| POST | `/api/opportunities/discover` | Start discovery run |
| GET | `/api/opportunities` | Lijst opportunities |
| POST | `/api/opportunities/:id/score` | Her-score opportunity |
| POST | `/api/opportunities/:id/generate-flow` | Genereer keuzehulp-flow |
| GET | `/api/statistics` | Statistieken |
| GET | `/api/health` | Health check |

## Architectuur

```
src/
  api/controllers/     # HTTP laag (geen businesslogica)
  services/            # Businesslogica
  repositories/        # Data access (Prisma)
  providers/ai/        # AIProvider + Gemini/OpenAI
  providers/keywords/  # KeywordProvider + Google
  prompts/             # Alle AI prompts (los van services)
  jobs/                # Cron scheduler
  container.ts         # Dependency Injection wiring
```

## Environment

Zie root `.env.example`. Minimaal vereist:

- `DATABASE_URL`
- `GEMINI_API_KEY`

Voor development zonder Google Ads credentials:

```env
GOOGLE_KEYWORD_INSIGHT_MOCK=true
```

## Provider vervangen

Wijzig `AI_PROVIDER=openai` en zet `OPENAI_API_KEY`. De `OpenAIProvider` implementeert dezelfde `AIProvider` interface als `GeminiProvider`.
