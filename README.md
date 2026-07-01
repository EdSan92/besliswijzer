# Besliswijzer

Schaalbaar SaaS-platform voor beslisbomen / guided flows (keuzehulpen).

## Stack

- **Frontend:** Nuxt 3 + Vue 3 + Pinia (SSR voor SEO)
- **Backend:** Fastify + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Flow engine:** JSON Logic (shared package)

## Quick start

### Vereisten

- Node.js 20+
- pnpm 9+
- Docker (voor PostgreSQL)

### Setup

```bash
# Clone / open project (map lokaal: `decision-engine` — hernoem naar `besliswijzer` wanneer gewenst)
cd decision-engine

# Environment
cp .env.example .env

# Dependencies
pnpm install

# Database
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Development (API + Web parallel)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Demo flow: http://localhost:3000/flows/warmtepomp-keuzehulp
- Admin: http://localhost:3000/admin

### Admin toegang

**Lokaal (development):** ga direct naar http://localhost:3000/admin — geen login nodig.

**Productie:** ga naar `/admin/login` en gebruik je `ADMIN_API_KEY` als wachtwoord.

## Projectstructuur

```
apps/
  api/     Fastify REST API
  web/     Nuxt 3 frontend (publiek + admin)
packages/
  flow-engine/   Branching & rule evaluatie
  flow-schema/   Zod types
  db/            Drizzle schema & migrations
```

## Deploy

Volledige stap-voor-stap guide: **[DEPLOY.md](./DEPLOY.md)**

Kort: **Neon** (Postgres) + **Railway** (2 services via `Dockerfile.api` en `Dockerfile.web`).

## Scripts

| Script | Beschrijving |
|--------|--------------|
| `pnpm dev` | Start API + Web |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:seed` | Seed demo flow |
| `pnpm test` | Run unit tests |

## API overzicht

### Public

- `GET /api/v1/public/flows/:slug` — Published flow
- `POST /api/v1/public/flows/:slug/step` — Submit antwoord
- `GET /api/v1/public/flows/:slug/results/:resultKey` — Resultaat
- `POST /api/v1/public/analytics/events` — Analytics batch
- `POST /api/v1/public/flows/:slug/leads` — Lead capture

### Admin (header `X-Admin-Key`)

- CRUD flows, nodes, options, rules, results
- `POST /api/v1/admin/flows/:id/publish` — Publish draft
- `GET /api/v1/admin/flows/:id/analytics` — Funnel stats
- `GET /api/v1/admin/flows/:id/leads` — CSV export

## Licentie

Private — solo developer MVP
