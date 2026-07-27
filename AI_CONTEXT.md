# Besliswijzer — AI Context Document

> **Doel:** Dit document geeft AI-assistenten volledige context over de Besliswijzer-applicatie.
> Gebruik het via `@AI_CONTEXT.md` in Cursor, of plak relevante secties in andere AI-tools.
>
> **Repo:** `decision-engine` (productnaam: Besliswijzer) · pnpm monorepo · TypeScript · Node 20+

---

## 1. Wat is Besliswijzer?

Besliswijzer is een **SaaS-platform voor beslisbomen (keuzehulpen / guided flows)** met:

- **Publieke site:** interactieve keuzehulpen, productpagina's, SEO-landingspagina's
- **Admin UI:** flow editor, opportunity pipeline, publicatie-workflow
- **AI pipeline:** automatische keyword discovery, scoring, FAQ/flow/productpagina-generatie

Het platform bestaat uit **drie services** en **vier shared packages**, allemaal in één monorepo.

---

## 2. Monorepo-structuur

```
decision-engine/
├── apps/
│   ├── api/                    # @besliswijzer/api — Fastify REST API (poort 3001/3101)
│   ├── web/                    # @besliswijzer/web — Nuxt 3 frontend (poort 3000)
│   └── opportunity-engine/     # @veraio/opportunity-engine — Express AI service (poort 3002)
├── packages/
│   ├── db/                     # @besliswijzer/db — Drizzle ORM, schema, migrations
│   ├── flow-schema/            # @besliswijzer/flow-schema — Zod types voor flows
│   ├── flow-engine/            # @besliswijzer/flow-engine — Runtime flow navigatie (pure logic)
│   └── product-schema/         # @besliswijzer/product-schema — Producten, pages, blocks, matching
├── AI_CONTEXT.md               # Dit document
├── README.md                   # Developer quick start
├── DEPLOY.md                   # Deploy guide (Neon + Railway)
└── .env.example                # Environment variabelen
```

### Stack

| Laag | Technologie |
|------|-------------|
| Frontend | Nuxt 3, Vue 3 Composition API, Pinia, SSR |
| API | Fastify, Drizzle ORM, Zod validatie |
| Opportunity Engine | Express, Prisma, Gemini/OpenAI, node-cron |
| Database | PostgreSQL (één DB, twee schema's) |
| Flow logica | JSON Logic via `@besliswijzer/flow-engine` |
| Package manager | pnpm 9 workspaces |

---

## 3. Architectuur

```
                    ┌─────────────────────────────────┐
                    │         Gebruiker / Admin        │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │   Nuxt Web (:3000)               │
                    │   SSR + server/api proxies       │
                    └───┬─────────────────────┬───────┘
                        │                     │
           /api/v1/public/*          /api/opportunity/*
                        │                     │
            ┌───────────▼──────────┐  ┌───────▼──────────────┐
            │  Fastify API        │  │  Opportunity Engine   │
            │  (:3001/3101)       │◄─┤  (:3002)              │
            │  Drizzle → public   │  │  Prisma → opportunity │
            └───────────┬──────────┘  └───┬──────────┬───────┘
                        │                 │          │
                        └────────┬────────┘          │
                                 │                   │
                    ┌────────────▼────────┐   ┌──────▼──────┐
                    │    PostgreSQL        │   │ Gemini /    │
                    │  public + opportunity│   │ Google Ads  │
                    └─────────────────────┘   └─────────────┘
```

### Verantwoordelijkheden

| Service | Eigenaar van | Praat met |
|---------|--------------|-----------|
| **Web** | UI, routing, SEO, admin sessie, API proxies | API, OE |
| **API** | Flows, productpagina's, analytics, leads, admin CRUD | PostgreSQL (public) |
| **Opportunity Engine** | Keyword discovery, AI scoring, content generatie | PostgreSQL (opportunity), API (admin push), Gemini, Google Ads |

**Belangrijk:** Alle user-facing content (flows, productpagina's, analytics) leeft in de **main API database**. De opportunity-engine genereert content en pusht die via authenticated admin endpoints naar de API.

---

## 4. Domeinmodel

### Flow (beslisboom)

Een **flow** is een versioned decision tree:

```
Flow
 └── FlowVersion (draft | published | archived)
      ├── FlowNode[]     — stappen (question | info | lead_capture)
      │    └── FlowOption[] — antwoordkeuzes
      ├── FlowRule[]     — branching (branch | result_map | skip) met JSON Logic conditions
      └── FlowResult[]   — eindresultaten (title, body, CTAs)
```

- **Portable format:** `FlowDefinition` (JSON import/export via admin API)
- **Runtime:** `@besliswijzer/flow-engine` evalueert rules zonder I/O
- **Versiebeheer:** draft → publish → archived; `flows.currentPublishedVersionId` wijst naar live versie

### Product & Productpagina

```
Product (slug, title, canonicalName, primaryFlowId, keywords)
 └── ProductPage (slug, blocks[], layout, seoMeta, status)
      └── ContentBlock[] (hero, intro, flow, faq, ...)
```

- **Publieke URL productpagina:** `/{pageSlug}` (bijv. `/warmtepomp`)
- **Flow URL:** `/flows/{flowSlug}` (fallback als geen productpagina gekoppeld)
- **Link-resolutie:** `resolveFlowHref(flowSlug, pageLinks)` → productpagina als gekoppeld, anders flow URL
- **Content blocks:** getypeerd in `@besliswijzer/product-schema`, gerenderd via block registry in web

### Opportunity (SEO pipeline)

```
Opportunity (keywordTerm, score, confidence, status)
 ├── flowDefinition?   — AI-gegenereerde flow (JSON)
 ├── faqItem?          — AI-gegenereerde FAQ (question + answer)
 └── routedPageSlug?   — doel-productpagina bij FAQ routing
```

**Status lifecycle:**

```
NEW → FLOW_GENERATED → PUBLISHED
  │                      (flow geïmporteerd + gepubliceerd in API)
  └→ ROUTED_TO_PRODUCT
       (FAQ toegevoegd aan bestaande productpagina)
  └→ REJECTED
```

### Product flow groups

Meerdere opportunity-flows voor één product kunnen worden **gemerged** (`mergeFlowDefinitions` in `@besliswijzer/flow-schema` / `@besliswijzer/product-schema`) tot één hub-flow met intent-selectie als entry node.

---

## 5. Database

**Eén PostgreSQL-database, twee schema's:**

### `public` schema (Drizzle — `@besliswijzer/db`)

| Tabel | Beschrijving |
|-------|-------------|
| `flow_categories` | Categorietaxonomie |
| `flows` | Flow metadata + SEO + published version pointer |
| `flow_versions` | Draft/published/archived versies |
| `flow_nodes` | Stappen binnen een versie |
| `flow_options` | Antwoordkeuzes per node |
| `flow_rules` | Branching rules (JSON Logic conditions) |
| `flow_results` | Eindresultaten |
| `analytics_events` | Funnel events (flow_start, step_view, step_complete, etc.) |
| `lead_submissions` | Email + answers snapshot |
| `products` | Productcatalogus |
| `product_pages` | Block-based pagina's (blocks + layout als JSONB) |
| `product_keywords` | Keywords voor product matching (optioneel `opportunity_id`) |

Schema: `packages/db/src/schema.ts` · Migrations: `packages/db/drizzle/`

### `opportunity` schema (Prisma — opportunity-engine)

| Tabel | Beschrijving |
|-------|-------------|
| `oe_categories` | Seed/discovery categorieën |
| `oe_keywords` | Keyword metrics + cached AI scores |
| `oe_opportunities` | Scored opportunities + flow/FAQ JSON |
| `oe_discovery_runs` | Discovery run samenvattingen |
| `oe_prompt_logs` | AI prompt audit trail |
| `oe_ai_calls` | Token/latency tracking |

Schema: `apps/opportunity-engine/prisma/schema.prisma`

---

## 6. Shared packages

### `@besliswijzer/flow-schema`

Zod schemas en TypeScript types. **Gebruik dit als single source of truth voor flow data structuren.**

Belangrijkste exports:
- `flowDefinitionSchema`, `flowSnapshotSchema`
- `flowNodeSchema`, `flowRuleSchema`, `flowResultSchema`
- `stepRequestSchema`, `analyticsBatchSchema`, `leadSubmissionSchema`
- `validateFlowDefinition`, `mergeFlowDefinitions`
- Response types: `PublicFlowResponse`, `StepResponse`, etc.

Locatie: `packages/flow-schema/src/`

### `@besliswijzer/flow-engine`

Pure runtime logica — **geen I/O, geen database calls.**

Belangrijkste exports:
- `getEntryNode`, `getNodeByKey`, `getResultByKey`
- `resolveNext` — evalueert JSON Logic rules, retourneert next node of result
- `validateAnswer`, `normalizeAnswer`, `getAnswerValidationError`
- `calculateProgress`

Locatie: `packages/flow-engine/src/index.ts`

### `@besliswijzer/product-schema`

Producten, productpagina's, content blocks, keyword matching.

Belangrijkste exports:
- `productSchema`, `productPageSchema`, `contentBlockSchema`
- Block data schemas: `heroBlockDataSchema`, `flowBlockDataSchema`, `faqBlockDataSchema`, etc.
- `pickBestProductMatch`, `scoreProductMatch`, `normalizeKeywordTerm`
- `buildProductFlowGroups`, `deriveProductSlugFromKeyword`, `resolveProductFlowSlug`
- `validateProductPageBlocks`, `sortContentBlocks`
- `pageSeoSchema`: `canonicalUrl` accepteert absolute URL's of root-relative paden (bijv. `/airfryer-kiezen`)

Locatie: `packages/product-schema/src/`

### `@besliswijzer/db`

Drizzle ORM client + schema + migrations + seed scripts.

Locatie: `packages/db/src/`

---

## 7. API Reference

### Main API — Public (`/api/v1/public/*`)

Geen authenticatie. Aangeroepen via Nuxt proxy: `server/api/v1/public/[...path].ts`

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/flows/page-links` | Map flowSlug → productPageSlug |
| GET | `/pages`, `/pages/:slug` | Productpagina's ophalen |
| GET | `/categories`, `/categories/:slug` | Categorieën + flows |
| GET | `/flows/popular`, `/flows/search` | Landing page data |
| GET | `/flows/:slug` | Gepubliceerde flow (entry node + metadata) |
| POST | `/flows/:slug/step` | Antwoord indienen, volgende node ophalen |
| GET | `/flows/:slug/results/:resultKey` | Resultaat ophalen |
| POST | `/analytics/events` | Analytics batch |
| POST | `/flows/:slug/leads` | Lead capture |

Routes: `apps/api/src/routes/public.ts`

### Main API — Admin (`/api/v1/admin/*`)

Authenticatie: header `x-admin-key` (zelfde waarde als `ADMIN_API_KEY`).
In productie: admin sessie via Nuxt proxy (`server/api/admin/[...path].ts`).

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/setup` | Eerste admin setup (install token) |
| CRUD | `/flows`, `/flows/:id/*` | Flow beheer |
| POST | `/flows/import` | FlowDefinition JSON importeren |
| POST | `/flows/:id/publish` | Draft publiceren |
| GET | `/flows/:id/export` | FlowDefinition exporteren |
| GET | `/flows/:id/analytics` | Funnel statistieken |
| GET | `/flows/:id/leads` | Leads CSV export |
| CRUD | `/categories` | Categorie beheer |
| GET | `/products/match?keyword=&category=` | Keyword → product matching |
| POST | `/product-pages` | Product + pagina aanmaken |
| POST | `/product-pages/:slug/faq-items` | FAQ item toevoegen aan pagina |

Routes: `apps/api/src/routes/admin.ts` · Services: `apps/api/src/services/`

### Opportunity Engine (`/api/*`)

Aangeroepen via Nuxt proxy: `server/api/opportunity/[...path].ts` (admin sessie vereist).

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/opportunities/discover` | Volledige discovery pipeline |
| GET | `/opportunities` | Lijst (filter: status, score) |
| POST | `/opportunities/:id/score` | Her-score |
| POST | `/opportunities/:id/generate-flow` | AI flow genereren |
| POST | `/opportunities/:id/generate-faq` | AI FAQ genereren |
| POST | `/opportunities/:id/route` | FAQ naar productpagina routeren |
| POST | `/opportunities/:id/publish` | Status → PUBLISHED |
| POST | `/opportunities/generate-flows` | Batch flow generatie |
| POST | `/product-pages/generate` | AI productpagina → opslaan via main API |
| POST | `/product-pages/preview` | AI productpagina preview |
| POST | `/product-flows/generate` | AI merged product-level flow |
| GET | `/statistics` | Discovery / AI usage stats |
| GET | `/health` | Health check |

Routes: `apps/opportunity-engine/src/api/routes.ts`

### OE → API integratie (`BesliswijzerApiClient`)

Locatie: `apps/opportunity-engine/src/clients/besliswijzer-api.client.ts`

| Methode | API endpoint | Gebruik |
|---------|-------------|---------|
| `matchProduct()` | `GET /admin/products/match` | Product vinden voor keyword |
| `appendFaqItem()` | `POST /admin/product-pages/:slug/faq-items` | FAQ toevoegen |
| `createProductPage()` | `POST /admin/product-pages` | Product + pagina persisten |

Config: `BESLIJSWIJZER_API_BASE` + `ADMIN_API_KEY`

---

## 8. Frontend

### Routes (Nuxt pages)

| Route | Bestand | Doel |
|-------|---------|------|
| `/` | `pages/index.vue` | Landing page |
| `/flows/:slug` | `pages/flows/[slug]/index.vue` | Flow wizard |
| `/flows/:slug/result/:key` | `pages/flows/[slug]/result/[key].vue` | Resultaat |
| `/:slug` | `pages/[slug].vue` | Productpagina (block renderer) |
| `/categorie/:slug` | `pages/categorie/[slug].vue` | Categorie-overzicht |
| `/admin` | `pages/admin/index.vue` | Admin dashboard |
| `/admin/opportunities` | `pages/admin/opportunities.vue` | Discovery pipeline |
| `/admin/flows/:id/edit` | Flow editor |
| `/admin/flows/:id/preview` | Flow preview |

### Belangrijke composables

| Composable | Bestand | Doel |
|------------|---------|------|
| `useApi()` | `composables/useApi.ts` | API calls naar main backend |
| `useOpportunityEngine()` | `composables/useOpportunityEngine.ts` | Volledige admin pipeline (discover, generate, import, publish, route) |
| `useFlowPageLinks()` | `composables/useFlowPageLinks.ts` | Flow → productpagina link mapping |
| `useBlockRegistry()` | `composables/useBlockRegistry.ts` | Content block rendering |
| `useProductPageSeo()` | `composables/useProductPageSeo.ts` | SEO meta voor productpagina's |

### Content block registry

Nieuwe block types toevoegen = 1 Vue component + 1 regel in registry:

```typescript
// apps/web/components/content-blocks/registry.ts
export const blockRegistry = {
  hero: HeroBlock,
  intro: IntroBlock,
  flow: FlowBlock,
  faq: FAQBlock,
}
```

Ondersteunde types staan in `@besliswijzer/product-schema` (`contentBlockTypeSchema`). Niet-geïmplementeerde types renderen als `UnsupportedBlock`.

### Server-side proxies (Nitro)

| Nuxt route | Target |
|------------|--------|
| `server/api/v1/public/[...path].ts` | Main API public endpoints |
| `server/api/admin/[...path].ts` | Main API admin endpoints (sessie check) |
| `server/api/opportunity/[...path].ts` | Opportunity Engine (sessie check) |

**Let op:** Geen brede `/api` devProxy in `nuxt.config.ts` — die overschrijft server routes.

### Belangrijke utils

| Util | Doel |
|------|------|
| `resolve-flow-href.ts` | Flow slug → URL (productpagina of /flows/) |
| `convert-opportunity-flow.ts` | OE flow JSON → Besliswijzer FlowDefinition |
| `group-opportunities-by-product.ts` | Opportunities groeperen per product voor merged flows |
| `resolve-flow-category.ts` | Categorie matching bij flow import |
| `landing-categories.ts` | Landing page categorie data |

---

## 9. Opportunity Engine intern

### Architectuur

```
src/
  api/controllers/     # HTTP laag (geen businesslogica)
  services/            # Businesslogica (discovery, scoring, routing, agents)
  repositories/        # Data access (Prisma)
  providers/ai/        # AIProvider interface + Gemini/OpenAI implementaties
  providers/keywords/  # KeywordProvider + Google Ads
  prompts/             # Alle AI prompts (los van services)
  clients/             # BesliswijzerApiClient
  jobs/                # Cron scheduler (discovery)
  container.ts         # Dependency injection wiring
  config/index.ts      # Environment config
```

### Discovery pipeline (stappen)

1. **load-seeds** — Seed categorieën laden
2. **collect-keywords** — Keywords verzamelen per categorie (Google Ads)
3. **score-keywords** — Batch AI scoring + cache
4. **store-opportunities** — Opportunities opslaan in DB
5. **route-faq** — Top N FAQ's auto-routeren naar productpagina's
6. **save-run** — Discovery run samenvatting opslaan

Config: `DISCOVERY_AUTO_ROUTE_FAQ=5`, `DISCOVERY_AUTO_GENERATE_FLOWS=0`

### AI agents

| Agent | Bestand | Output |
|-------|---------|--------|
| Product flow agent | `services/product-flow.agent.ts` | Merged flow definition |
| Product page agent | `services/product-page-content.agent.ts` | Content blocks + SEO |
| FAQ generatie | `prompts/generate-faq.prompt.ts` | FAQ item JSON |
| Flow generatie | `prompts/generate-product-flow.prompt.ts` | Flow definition JSON |

Prompts staan **altijd** in `prompts/` — niet inline in services.

---

## 10. Kernworkflows

### A. Gebruiker doorloopt een flow

```
1. GET /public/flows/:slug          → entry node + opties
2. POST /public/flows/:slug/step    → antwoord + sessionId
   → flow-engine resolveNext()       → next node OF result
3. GET /public/flows/:slug/results/:key → resultaat tonen
4. POST /public/analytics/events    → funnel tracking
5. POST /public/flows/:slug/leads   → lead capture (optioneel)
```

Frontend: `components/flow/Wizard.vue` · Engine: `packages/flow-engine/`

### B. Admin publiceert opportunity als flow

```
1. POST /api/opportunity/opportunities/discover     → keywords vinden
2. POST /api/opportunity/opportunities/:id/generate-flow → AI flow
3. Web: convertOpportunityFlowToBesliswijzer()       → format conversie
4. POST /api/v1/admin/flows/import                   → flow in main DB
5. POST /api/v1/admin/flows/:id/publish              → live zetten
6. POST /api/opportunity/opportunities/:id/publish   → status update
```

Orchestratie: `composables/useOpportunityEngine.ts` · Admin UI: `pages/admin/opportunities.vue`

### C. FAQ routing naar productpagina

```
1. OE: matchProduct(keyword)                         → bestaand product vinden
2. OE: generate FAQ (AI)                             → faqItem JSON
3. OE: appendFaqItem(pageSlug, faq)                → FAQ block updaten in main DB
4. OE: status → ROUTED_TO_PRODUCT
```

Service: `apps/opportunity-engine/src/services/product-router.service.ts`

### D. AI productpagina genereren

```
1. POST /api/product-pages/generate (OE)             → AI genereert blocks
2. OE: createProductPage() via BesliswijzerApiClient  → persist in main DB
3. Live op /{pageSlug}
```

Agent: `services/product-page-content.agent.ts`

---

## 11. Conventies & regels voor AI

### Code style

- **TypeScript overal** — geen plain JavaScript
- **Strict typing** — vermijd `any`
- **async/await** — geen callbacks
- **Zod** voor input validatie (API routes, schemas)
- **ES modules** — import/export
- **Composition API** in Vue — geen Options API
- **Composables** voor gedeelde frontend logica (niet dupliceren over components)

### Backend patronen

- **API:** Fastify routes → services → Drizzle queries. Geen businesslogica in routes.
- **OE:** Express controllers → services → Prisma repositories. Geen businesslogica in controllers.
- **Prompts:** Altijd in `prompts/` directory, nooit inline in services.
- **Shared logic:** In packages, niet gekopieerd tussen apps.

### Frontend patronen

- **Server routes** (`server/api/`) voor backend proxies — niet direct vanuit client naar externe API's.
- **Auto-imports** waar Nuxt dat ondersteunt.
- **Block registry** voor content blocks — niet hardcoded switch statements.
- **resolveFlowHref()** voor alle flow links — niet handmatig `/flows/` hardcoden.

### Scope-beperkingen

- **Minimale diffs** — verander geen ongerelateerde code
- **Geen over-engineering** — geen abstractions voor 1-2 regels code
- **Bestaande conventies volgen** — lees surrounding code voor je schrijft
- **Geen tests** tenzij gevraagd of voor echte behavior coverage
- **Geen comments** behalve voor non-obvious business logic

### Veelgemaakte fouten

| Fout | Correct |
|------|---------|
| Flow logica in API route schrijven | Gebruik `@besliswijzer/flow-engine` |
| Flow types handmatig definiëren | Importeer uit `@besliswijzer/flow-schema` |
| Direct vanuit browser naar API :3001 | Via Nuxt server proxy routes |
| Opportunity data in public schema | Opportunity data zit in `opportunity` schema (Prisma) |
| Nieuwe content block zonder schema update | Eerst type toevoegen in `product-schema`, dan component + registry |
| `pnpm dev` verwacht OE te starten | `pnpm dev` start alleen API + Web; OE apart via `pnpm dev:opportunity` |

---

## 12. Environment variabelen

Zie `.env.example` voor volledige lijst. Minimaal:

```env
DATABASE_URL=postgresql://decision:decision@localhost:5432/besliswijzer
ADMIN_API_KEY=change-me-in-production
API_PORT=3101
NUXT_PUBLIC_API_BASE=http://localhost:3101
GEMINI_API_KEY=your-gemini-api-key
OPPORTUNITY_PORT=3002
BESLIJSWIJZER_API_BASE=http://localhost:3101
DISCOVERY_AUTO_ROUTE_FAQ=5
DISCOVERY_AUTO_GENERATE_FLOWS=0
GOOGLE_KEYWORD_INSIGHT_MOCK=true
```

---

## 13. Dev commands

```bash
pnpm install                          # Dependencies
docker compose up -d postgres         # PostgreSQL
pnpm db:migrate                       # Drizzle migrations (public schema)
pnpm db:seed                          # Warmtepomp + robotmaaier + airfryer + robotstofzuiger + mesh wifi referentieflows + productpagina's
pnpm dev                              # API + Web parallel
pnpm dev:opportunity                  # Opportunity Engine apart
pnpm test                             # Alle unit tests
pnpm db:seed:product-page             # Alleen robot productpagina (flow moet bestaan)
pnpm migrate:merge-product-flows      # Product flow merge migratie
pnpm test:e2e                         # Playwright (lokaal; CI=true forceert 1 worker)
pnpm test:e2e:install                 # Chromium installeren voor E2E
```

**CI (GitHub Actions):** workflow `.github/workflows/ci.yml` op push/PR naar `main` — `pnpm lint`, `pnpm test`, `pnpm build`, daarna Playwright E2E met Postgres service container en `CI=true`.

**URLs lokaal:**
- Web: http://localhost:3000
- API: http://localhost:3101 (of 3001)
- OE: http://localhost:3002
- Demo flow: http://localhost:3000/flows/warmtepomp-keuzehulp
- Robotmaaier SEO-pagina: http://localhost:3000/robotmaaier-kiezen
- Robotmaaier flow: http://localhost:3000/flows/robotmaaiers
- Airfryer SEO-pagina: http://localhost:3000/airfryer-kiezen
- Airfryer flow: http://localhost:3000/flows/airfryers
- Robotstofzuiger SEO-pagina: http://localhost:3000/robotstofzuiger-kiezen
- Robotstofzuiger flow: http://localhost:3000/flows/robotstofzuigers
- Mesh wifi SEO-pagina: http://localhost:3000/mesh-wifi-kiezen
- Mesh wifi flow: http://localhost:3000/flows/mesh-wifi
- Admin: http://localhost:3000/admin (geen login in dev)

---

## 14. Bestandsindex (snel navigeren)

### Flow systeem
| Bestand | Rol |
|---------|-----|
| `packages/flow-schema/src/index.ts` | Alle flow types + Zod schemas |
| `packages/flow-engine/src/index.ts` | Runtime navigatie + JSON Logic |
| `packages/flow-schema/src/merge-flow-definitions.ts` | Flow merging logica |
| `apps/api/src/services/flow-service.ts` | Flow CRUD + step resolution |
| `apps/api/src/routes/public.ts` | Publieke flow endpoints |
| `apps/api/src/routes/admin.ts` | Admin flow CRUD + publish |
| `apps/web/components/flow/Wizard.vue` | Frontend flow wizard |
| `flows/examples/airfryer-keuzehulp.json` | Airfryer referentieflow (R1.1) |
| `packages/flow-engine/src/airfryers-flow.test.ts` | Airfryer routing tests |
| `packages/db/src/seed-airfryer-reference.ts` | Airfryer seed orchestrator |
| `packages/db/src/seed-airfryer-product-page.ts` | Airfryer product + SEO-pagina seed |
| `e2e/airfryer-flow.spec.ts` | Airfryer E2E (flow + embed) |
| `flows/examples/robotstofzuiger-keuzehulp.json` | Robotstofzuiger referentieflow (R1.6) |
| `packages/flow-engine/src/robotstofzuigers-flow.test.ts` | Robotstofzuiger routing tests |
| `packages/db/src/seed-robotstofzuiger-reference.ts` | Robotstofzuiger seed orchestrator |
| `packages/db/src/seed-robotstofzuiger-product-page.ts` | Robotstofzuiger product + SEO-pagina seed |
| `e2e/robotstofzuiger-flow.spec.ts` | Robotstofzuiger E2E (flow + embed) |
| `flows/examples/mesh-wifi-keuzehulp.json` | Mesh wifi referentieflow (R1.7) |
| `packages/flow-engine/src/mesh-wifi-flow.test.ts` | Mesh wifi routing tests |
| `packages/db/src/seed-mesh-wifi-reference.ts` | Mesh wifi seed orchestrator |
| `packages/db/src/seed-mesh-wifi-product-page.ts` | Mesh wifi product + SEO-pagina seed |
| `e2e/mesh-wifi-flow.spec.ts` | Mesh wifi E2E (flow + embed) |

### Product & pagina's
| Bestand | Rol |
|---------|-----|
| `packages/product-schema/src/` | Alle product/page/block schemas |
| `packages/db/src/schema.ts` | Database tabellen |
| `apps/api/src/services/product-page-service.ts` | Product page CRUD |
| `apps/api/src/services/product-router-service.ts` | Product matching |
| `apps/web/pages/[slug].vue` | Productpagina renderer |
| `apps/web/components/content-blocks/` | Block components + registry |

### Opportunity pipeline
| Bestand | Rol |
|---------|-----|
| `apps/opportunity-engine/src/services/discovery.service.ts` | Discovery orchestratie |
| `apps/opportunity-engine/src/services/opportunity.service.ts` | Opportunity businesslogica |
| `apps/opportunity-engine/src/services/product-router.service.ts` | FAQ routing |
| `apps/opportunity-engine/src/services/product-flow.agent.ts` | AI flow generatie |
| `apps/opportunity-engine/src/services/product-page-content.agent.ts` | AI page generatie |
| `apps/opportunity-engine/src/clients/besliswijzer-api.client.ts` | Push naar main API |
| `apps/web/composables/useOpportunityEngine.ts` | Frontend orchestratie |
| `apps/web/pages/admin/opportunities.vue` | Admin pipeline UI |
| `apps/web/utils/convert-opportunity-flow.ts` | Flow format conversie |

### Database
| Bestand | Rol |
|---------|-----|
| `packages/db/src/schema.ts` | Drizzle schema (public) |
| `packages/db/drizzle/` | SQL migrations |
| `apps/opportunity-engine/prisma/schema.prisma` | Prisma schema (opportunity) |

---

## 15. Visueel overzicht

Een interactief architectuurdiagram staat in de Cursor Canvas:
`canvases/besliswijzer-overzicht.canvas.tsx` (openbaar in Cursor IDE naast de chat).

---

*Laatst bijgewerkt: 27 juli 2026 · Gebaseerd op de decision-engine monorepo*
