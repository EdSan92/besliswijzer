# Veraio Opportunity Engine

Modulaire AI Opportunity Engine voor het automatisch ontdekken van winstgevende keywords en het routeren naar FAQ op productpagina's.

## Stack

- Express + TypeScript
- PostgreSQL + Prisma
- Google Gemini (verwisselbaar via `AIProvider` interface)
- Google Ads Keyword Planning API (Keyword Insight)
- Besliswijzer API (product matching + FAQ append)
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
| POST | `/api/opportunities/discover` | Start discovery run (auto-route FAQ naar productpagina's) |
| GET | `/api/opportunities` | Lijst opportunities |
| POST | `/api/opportunities/:id/score` | Her-score opportunity |
| POST | `/api/opportunities/:id/generate-faq` | Genereer FAQ-item (AI) |
| POST | `/api/opportunities/:id/route` | Markeer als gerouteerd naar productpagina |
| POST | `/api/opportunities/:id/generate-flow` | Genereer keuzehulp-flow (legacy) |
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
- `BESLIJSWIJZER_API_BASE` (default `http://localhost:3101`)
- `ADMIN_API_KEY` (zelfde waarde als Besliswijzer API)

Discovery stuurt standaard de top 5 nieuwe opportunities naar FAQ op een bestaande productpagina (`DISCOVERY_AUTO_ROUTE_FAQ=5`). Flow-generatie staat uit (`DISCOVERY_AUTO_GENERATE_FLOWS=0`).

Voor development zonder Google Ads credentials:

```env
GOOGLE_KEYWORD_INSIGHT_MOCK=true
```

## Provider vervangen

Wijzig `AI_PROVIDER=openai` en zet `OPENAI_API_KEY`. De `OpenAIProvider` implementeert dezelfde `AIProvider` interface als `GeminiProvider`.
