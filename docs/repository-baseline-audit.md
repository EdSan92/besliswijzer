# Repository Baseline Audit — R0.1

**Project:** Veraio / Besliswijzer (`decision-engine` monorepo)  
**Datum:** 21 juli 2026  
**Branch:** `main` @ `9d432bd` (*Add AI opportunity engine and move discovery tooling to admin.*)  
**Auditor:** Cursor agent (R0.1 — baseline audit, geen implementatie)

---

## 1. Executive summary

De repository is een **pnpm 9 monorepo** met drie actieve services (Fastify API, Nuxt web, Express Opportunity Engine) en vier shared packages. De architectuur is goed gedocumenteerd in `AI_CONTEXT.md`, maar **productie-stabiliteit is op dit moment niet gegarandeerd**:

| Domein | Status |
|--------|--------|
| Unit tests (`pnpm test`) | ✅ 133 tests groen in 6 packages |
| Lint / typecheck (`pnpm lint`) | ❌ Faalt in 4 van 7 packages |
| Build (`pnpm build`) | ❌ Faalt op `@besliswijzer/flow-schema` (blokkeert downstream) |
| Root `pnpm test:unit` | ❌ `vitest` niet beschikbaar op root |
| CI/CD | ❌ Geen `.github/workflows` |
| Lokale infra | ❌ Docker Desktop niet actief; geen `.env` aanwezig |
| Git working tree | ⚠️ 106 gewijzigde/nieuwe bestanden ongecommit (grote WIP: productpagina's) |

**Kernconclusie:** de codebase bevindt zich midden in een grote feature-uitbreiding (productpagina's, content blocks, FAQ-routing, flow-merge). Unit tests slagen, maar **lint en build falen**, er is **geen CI**, en er zijn **security- en deploy-risico's** (ongeschermde OE-endpoints, publieke Gemini-proxy, incomplete Docker-buildketen). Stabilisatie vereist eerst commit-discipline, typecheck-fixes, build-keten repareren, en daarna CI + security hardening.

---

## 2. Bevestigde architectuur en actieve services

### 2.1 Monorepo-structuur

Bron: `AI_CONTEXT.md` §2–3, `pnpm-workspace.yaml`, root `package.json`.

```
decision-engine/
├── apps/
│   ├── api/                    @besliswijzer/api       Fastify REST (:3001/:3101)
│   ├── web/                    @besliswijzer/web       Nuxt 3 SSR (:3000)
│   └── opportunity-engine/     @veraio/opportunity-engine  Express (:3002)
├── packages/
│   ├── db/                     @besliswijzer/db        Drizzle → public schema
│   ├── flow-schema/            @besliswijzer/flow-schema
│   ├── flow-engine/            @besliswijzer/flow-engine
│   └── product-schema/         @besliswijzer/product-schema  (nieuw, untracked deels)
├── e2e/                        Playwright specs
├── docs/                       (dit rapport)
├── AI_CONTEXT.md               Architectuurbron
├── README.md                   Quick start (verouderd t.o.v. AI_CONTEXT)
├── DEPLOY.md                   Neon + Railway (alleen API + Web)
└── .env.example
```

### 2.2 Actieve services

| Service | Package | Poort | Database | Deploy |
|---------|---------|-------|----------|--------|
| Main API | `@besliswijzer/api` | `API_PORT` / `PORT` (default 3001; `.env.example` → 3101) | PostgreSQL `public` (Drizzle) | Railway via `Dockerfile.api` |
| Web | `@besliswijzer/web` | 3000 | — (proxies) | Railway via `Dockerfile.web` |
| Opportunity Engine | `@veraio/opportunity-engine` | `OPPORTUNITY_PORT` (3002) | PostgreSQL `opportunity` (Prisma) | **Niet gedocumenteerd in DEPLOY.md** |

### 2.3 Shared packages

| Package | Rol | Build nodig voor runtime? |
|---------|-----|----------------------------|
| `flow-schema` | Zod types, flow validatie | Ja (`dist/`) |
| `flow-engine` | Runtime flow navigatie | Ja (`dist/`) |
| `product-schema` | Producten, pages, blocks | Ja (`dist/`) — **niet in Dockerfile-buildketen** |
| `db` | Drizzle schema + migraties | Ja (`dist/`) |

### 2.4 Naamgeving / merk

- Root package: `besliswijzer` (`package.json`)
- Product/engine: **Veraio** (`apps/opportunity-engine/README.md`, `apps/api/railway.toml` → `WEB_ORIGIN` bevat `www.veraio.nl`)
- Repo-map: `decision-engine`
- Documentatie mixt Besliswijzer en Veraio — inconsistent maar functioneel

### 2.5 Instructies gelezen

| Bron | Locatie | Status |
|------|---------|--------|
| AI context | `AI_CONTEXT.md` | ✅ Uitgebreid, recent (juli 2026) |
| Quick start | `README.md` | ⚠️ Mist OE, product-schema, productpagina's |
| Deploy | `DEPLOY.md` | ⚠️ Alleen API + Web |
| OE README | `apps/opportunity-engine/README.md` | ✅ Actueel voor OE |
| Cursor rule (repo) | `.cursor/rules/update-documentation.mdc` | ✅ Aanwezig |
| Cursor rules (user-level) | TDD, implementation-workflow, AI cost | Referenced in IDE, **niet in repo** |
| AGENTS.md | — | ❌ Afwezig |

---

## 3. Werkende en falende commando's

Omgeving: **Node v26.3.0**, **pnpm 9.15.0** (engines vereisen `>=20`).  
Opmerking: PowerShell execution policy blokkeert `pnpm.ps1`; commando's uitgevoerd via `pnpm.cmd`.

### 3.1 Overzicht

| Commando | Resultaat | Details |
|----------|-----------|---------|
| `pnpm lint` | ❌ Exit 2 | Stopt bij `@besliswijzer/flow-schema` |
| `pnpm --filter @besliswijzer/web lint` | ❌ Exit 2 | 5 TypeScript-fouten |
| `pnpm --filter @besliswijzer/api lint` | ❌ Exit 2 | 3 TypeScript-fouten |
| `pnpm --filter @veraio/opportunity-engine lint` | ❌ Exit 2 | 3 TypeScript-fouten |
| `pnpm --filter @besliswijzer/db lint` | ✅ Exit 0 | — |
| `pnpm --filter @besliswijzer/flow-engine lint` | ✅ Exit 0 | — |
| `pnpm --filter @besliswijzer/product-schema lint` | ✅ Exit 0 | — |
| `pnpm test` | ✅ Exit 0 | 133 tests, 6 packages (*7 of 8* — `@besliswijzer/db` heeft geen `test` script) |
| `pnpm test:unit` | ❌ Exit 1 | `'vitest' is not recognized` — vitest staat niet in root `devDependencies` |
| `pnpm build` | ❌ Exit 2 | `@besliswijzer/flow-schema` — testfixtures missen `ctas` |
| `pnpm dev` | ⏭️ Niet uitgevoerd | Langlopend; vereist `.env` + Postgres |
| `pnpm dev:opportunity` | ⏭️ Niet uitgevoerd | Vereist `.env` + Postgres + `GEMINI_API_KEY` |
| `pnpm db:migrate` | ⏭️ Niet uitgevoerd | Docker/Postgres niet beschikbaar |
| `pnpm test:e2e` | ⏭️ Niet uitgevoerd | Vereist Playwright + Postgres + services |
| `docker ps` | ❌ | Docker daemon niet actief |
| `pnpm --filter @veraio/opportunity-engine db:generate` | ❌ Exit 1 | `EPERM` bij Prisma query engine rename (Windows file lock) |

### 3.2 Lint-fouten (concrete bestanden)

**`packages/flow-schema`** — `src/flow-definition.test.ts` regels 56, 57, 138:
```
Property 'ctas' is missing in type '{ resultKey, title, body: {} }'
```
Oorzaak: `flowResultSchema` vereist `ctas`; testfixtures niet bijgewerkt. Testbestanden staan onder `src/**/*` en worden mee gecompileerd door `tsc` (`tsconfig.json` `include: ["src/**/*"]`).

**`apps/api`** — `src/routes/admin.ts` regels 322, 384:
```
contentBlockSchema inferred types incompatible with CreateProductPageInput / UpdateProductPageInput
(property 'source' optional in Zod output vs required in service types)
```
Plus `src/services/flow-service.test.ts(34)`: ontbrekende `ctas`.

**`apps/web`** — `nuxt typecheck`:
- `components/flow/QuestionRenderer.vue(72)`: `unknown` vs `unknown[]`
- `server/api/v1/public/[...path].ts(18)`: excessive stack depth (Nitro route types)
- `utils/convert-opportunity-flow.ts(22,90)`: type mismatches bij flow-conversie

**`apps/opportunity-engine`** — `src/services/product-page-content.agent.ts`:
- Regel 7: `GenerateProductPageRequest` niet geëxporteerd uit `models/schemas.js`
- Regel 140: spread types error
- Regel 151: implicit `any`

### 3.3 Testresultaten (`pnpm test`)

| Package | Test files | Tests |
|---------|------------|-------|
| `@besliswijzer/flow-schema` | 2 | 15 |
| `@besliswijzer/product-schema` | 3 | 8 |
| `@besliswijzer/flow-engine` | 1 | 22 |
| `@veraio/opportunity-engine` | 16 | 44 |
| `@besliswijzer/api` | 4 | 9 (incl. 2 smoke tests die skippen zonder draaiende API) |
| `@besliswijzer/web` | 10 | 35 |
| **Totaal** | **36** | **133** |

---

## 4. Database- en migratiestatus

### 4.1 Drizzle (`public` schema)

| Item | Locatie | Status |
|------|---------|--------|
| Schema | `packages/db/src/schema.ts` | Gewijzigd (uncommitted) — producttabellen |
| Migraties | `packages/db/drizzle/` | 3 entries in `_journal.json` |
| `0000_boring_ben_grimm.sql` | Initieel | Gecommit |
| `0001_tan_molten_man.sql` | — | Gecommit |
| `0002_product_pages.sql` | Producten, pages, keywords | **Untracked** (WIP) |
| Migrate script | `packages/db/src/migrate.ts` | Draait `drizzle-orm/postgres-js/migrator` |
| Seed scripts | `seed.ts`, `seed-product-page.ts` (nieuw) | Product seed untracked |

**Verificatie:** `pnpm db:migrate` niet uitgevoerd — Docker Desktop niet actief (`docker ps` → pipe niet gevonden). Migratiestatus op database **onbekend**.

### 4.2 Prisma (`opportunity` schema)

| Item | Locatie | Status |
|------|---------|--------|
| Schema | `apps/opportunity-engine/prisma/schema.prisma` | Gewijzigd — `ROUTED_TO_PRODUCT`, `faqItem`, `routedPageSlug` |
| Migratie map | `prisma/migrations/20260715_route_to_product/migration.sql` | **Untracked** |
| `migration_lock.toml` | Untracked | PostgreSQL provider |
| OE README setup | `db:push` | Geen `migrate deploy` workflow gedocumenteerd |

**Afwijking:** git status toont ook `20260715_route_to_product.sql` op migrations-root (mogelijk dubbel/verkeerd formaat). Standaard Prisma verwacht `migrations/<timestamp>_<name>/migration.sql`.

**Verificatie:** `prisma generate` faalde met Windows `EPERM` (file lock op query engine). Prisma client status **onbekend**.

### 4.3 Docker Compose

`docker-compose.yml`:
- **postgres:16** — gebruikt, gedocumenteerd
- **redis:7** — gedefinieerd maar **nergens in code gerefereerd** (dode infra)

Geen `.env` in workspace → lokale services kunnen niet starten zonder handmatige setup (`cp .env.example .env`).

---

## 5. Test- en CI-status

### 5.1 Unit tests

- ✅ `pnpm test` (recursive) — 133/133 groen
- ❌ `pnpm test:unit` — broken (root mist `vitest` in `devDependencies`; script verwijst naar `vitest.workspace.ts`)
- Workspace: `vitest.workspace.ts` omvat 6 packages; `@besliswijzer/db` ontbreekt (geen tests)

### 5.2 Integratie / smoke tests

`apps/api/src/smoke.test.ts`:
- Probeert `http://localhost:3001/health` en public flow endpoint
- **Skipped gracefully** als API niet draait (was het geval tijdens audit)
- Geen harde failure — lage signal-waarde in CI zonder service orchestration

`apps/opportunity-engine/src/services/opportunity-scorer.integration.test.ts`:
- Mock-based integratie; slaagt zonder externe services

### 5.3 End-to-end tests

Locatie: `e2e/` (Playwright)

| Spec | Doel |
|------|------|
| `home.spec.ts` | Landing |
| `admin.spec.ts` | Admin |
| `flow-wizard.spec.ts` | Flow wizard |
| `opportunities.spec.ts` | Opportunity pipeline |

Config: `playwright.config.ts` — start API (:3101) + Web (:3100), `global-setup.ts` roept `pnpm db:migrate` + `pnpm db:seed` aan.

**Niet uitgevoerd** — vereist Docker Postgres + Playwright browser install.

Root scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:install`.

### 5.4 CI/CD

- ❌ Geen `.github/workflows/` gevonden
- Geen geautomatiseerde lint/test/build gate
- Railway deploy via `apps/api/railway.toml` en `apps/web/railway.toml` (handmatig)

---

## 6. Security- en deploymentrisico's

### 6.1 Authenticatie

| Laag | Mechanisme | Risico |
|------|-----------|--------|
| Main API admin | `X-Admin-Key` header (`apps/api/src/routes/admin.ts` `verifyAdminKey`) | Default `dev-admin-key` in code (`apps/api/src/index.ts:35`) |
| Web admin sessie | Cookie `admin_session`; **dev bypass** `process.dev → true` (`apps/web/server/utils/admin-auth.ts:5`) | Verwacht gedrag lokaal |
| OE API | **Geen authenticatie** op Express routes (`apps/opportunity-engine/src/api/routes.ts`) | P0 als poort 3002 publiek bereikbaar is |
| OE → API | `BesliswijzerApiClient` met `ADMIN_API_KEY` | OK intern |
| Web → OE proxy | Admin sessie check (`server/api/opportunity/[...path].ts:6`) | OK via Nuxt |
| Preview step | `/api/v1/admin/flows/:id/preview/step` (`preview.ts`) | Valt onder admin `preHandler` hook (URL prefix `/api/v1/admin`) — beschermd via admin key |

### 6.2 Publieke endpoints met kostenimpact

**`POST /api/gemini/chat`** (`apps/web/server/api/gemini/chat.post.ts`):
- Geen authenticatie of rate limit
- Proxy't naar Google Gemini met server-side API key
- Publiek bereikbaar via `/gemini` pagina
- **Risico:** API-key misbruik / onbeperkte kosten in productie

### 6.3 CORS en rate limiting

- API public routes: rate limit 100/min (`apps/api/src/index.ts:41-44`)
- OE: `cors()` zonder restrictie (`apps/opportunity-engine/src/index.ts:17`)
- API CORS: `WEB_ORIGIN` split of `true` (dev)

### 6.4 Deployment

| Risico | Bewijs |
|--------|--------|
| `Dockerfile.api` bouwt **`product-schema` niet** | Regels 12-15: alleen flow-schema, flow-engine, db, api — terwijl `@besliswijzer/api` `product-schema` importeert |
| `Dockerfile.web` bouwt **`product-schema` niet** | Regels 15-17 — web importeert `@besliswijzer/product-schema` |
| OE niet in deploy docs | `DEPLOY.md` — alleen 2 Railway services |
| Default API URL hardcoded | `Dockerfile.web:12`, `nuxt.config.ts:27`, `railway.toml` |
| Secrets in `.env.example` | Placeholder waarden; duplicaat `BESLIJSWIJZER_API_BASE` (regels 15-16) |
| Admin cookie niet httpOnly | `admin-auth.ts:12` — bewust voor client middleware; cookiewaarde is `"1"` (geen secret) |

### 6.5 Environment variabelen

Minimaal vereist (`.env.example` + OE config):

| Variabele | Service | Opmerking |
|-----------|---------|-----------|
| `DATABASE_URL` | Alle | Shared Postgres, twee schema's |
| `ADMIN_API_KEY` | API, Web, OE | Moet gelijk zijn |
| `GEMINI_API_KEY` | OE (+ Web voor `/api/gemini/chat`) | Verplicht in OE (`config/index.ts:13`) |
| `NUXT_PUBLIC_API_BASE` | Web | Build-time + runtime |
| `BESLIJSWIJZER_API_BASE` | OE | Push naar main API |
| `OPPORTUNITY_API_BASE` / `NUXT_OPPORTUNITY_API_BASE` | Web | OE proxy |
| `GOOGLE_KEYWORD_INSIGHT_MOCK` | OE | Dev zonder Google Ads |

---

## 7. Tijdelijke, experimentele of dode code

### 7.1 Debug scripts (untracked)

| Script | Doel |
|--------|------|
| `apps/api/src/scripts/debug-product-match.ts` | Handmatige product match test (`robotstofzuiger`) |
| `apps/api/src/scripts/debug-robotstofzuiger-page.ts` | Debug productpagina regenerate |
| `apps/api/src/scripts/migrate-merge-product-flows.ts` | Eenmalige data-migratie (wel root script `pnpm migrate:merge-product-flows`) |

### 7.2 Experimentele UI

| Item | Locatie |
|------|---------|
| Gemini demo pagina | `apps/web/pages/gemini.vue` + `/api/gemini/chat` |
| Landing AI advice cards | `apps/web/components/landing/LandingAiAdviceCard.vue` (gewijzigd) |

### 7.3 Dode / ongebruikte infra

| Item | Locatie |
|------|---------|
| Redis service | `docker-compose.yml:18-23` — geen code-referenties |
| Canvas architectuurdiagram | `AI_CONTEXT.md:607-608` verwijst naar `canvases/besliswijzer-overzicht.canvas.tsx` — **bestand niet aanwezig** |

### 7.4 Legacy / parallelle paden

- OE flow-generatie endpoints gemarkeerd als "legacy" in OE README
- `import-flow.ts` — ondersteund CLI script (gecommit)
- Dubbele Prisma migratie-paden in git status (mogelijk handmatige SQL naast Prisma map)

### 7.5 Build artifacts in working tree

Untracked `dist/`, `.nuxt/`, `node_modules/.vite/` — normaal gitignored maar zichtbaar in git status door untracked parent dirs; **niet committen**.

---

## 8. Afwijkingen tussen documentatie en code

| Document | Afwijking | Code-realiteit |
|----------|-----------|----------------|
| `README.md` § Projectstructuur | Alleen api, web, 3 packages | Monorepo heeft ook OE + `product-schema` |
| `README.md` § Scripts | Alleen dev, db, test | Root heeft ook `dev:opportunity`, `test:e2e`, product scripts |
| `README.md` § API poort | `:3001` | `.env.example` default `:3101`; `AI_CONTEXT.md` documenteert beide |
| `DEPLOY.md` | 2 Railway services | OE draait lokaal; geen productie-deploy beschreven |
| `DEPLOY.md` | Repo `EdSan92/besliswijzer` | Lokale map `decision-engine` |
| `AI_CONTEXT.md` § Canvas | `canvases/besliswijzer-overzicht.canvas.tsx` | Bestand ontbreekt |
| `AI_CONTEXT.md` § Conventies | "Geen tests tenzij gevraagd" | User/repo rules vereisen TDD — conflict |
| OE README | Setup via `db:push` | Migratiemap aanwezig (`20260715_route_to_product/`) — twee workflows |
| `.env.example` | `BESLIJSWIJZER_API_BASE` | Dubbel genoteerd (regels 15-16) |
| `package.json` name | `besliswijzer` | Productnaam Veraio in OE README en Railway CORS |
| Cursor rules in repo | Alleen `update-documentation.mdc` | IDE heeft extra rules (TDD, workflow) niet versioned |
| `vitest.workspace.ts` | 6 workspaces | Root `test:unit` broken — script/documentatie inconsistent |
| Admin product pages | `AI_CONTEXT.md` admin routes | Grotendeels uncommitted WIP |

---

## 9. Risico's (P0 – P3)

### P0 — Blokkerend voor stabiele productie

| # | Risico | Bewijs |
|---|--------|--------|
| P0-1 | **`pnpm build` faalt** — Railway Docker build likely broken voor flow-schema + downstream | Build output juli 2026; `Dockerfile.api` / `Dockerfile.web` run `pnpm build` |
| P0-2 | **Docker build mist `@besliswijzer/product-schema`** | `Dockerfile.api:12-15`, `Dockerfile.web:15-17`; API/Web depend on product-schema sinds WIP |
| P0-3 | **106 uncommitted files** — main branch niet deployable/reviewable | `git status --short` → 106 entries |
| P0-4 | **OE zonder auth** — discovery/AI endpoints open als service exposed | `apps/opportunity-engine/src/api/routes.ts`, geen middleware |
| P0-5 | **Publieke Gemini proxy zonder auth/rate limit** | `apps/web/server/api/gemini/chat.post.ts` |

### P1 — Hoog; snel adresseren

| # | Risico | Bewijs |
|---|--------|--------|
| P1-1 | **Geen CI** — regressies niet automatisch gevangen | Geen `.github/workflows` |
| P1-2 | **`pnpm lint` faalt** in api, web, OE, flow-schema | §3.2 |
| P1-3 | **Drizzle migratie `0002_product_pages.sql` untracked** — prod schema mismatch | Untracked migration + gewijzigd schema |
| P1-4 | **Prisma OE migratie untracked** — `db:push` vs migrate inconsistentie | Untracked `prisma/migrations/` |
| P1-5 | **`pnpm test:unit` broken** op root | `vitest` not recognized |
| P1-6 | **Default secrets** (`dev-admin-key`, `dev-jwt-secret`) | `apps/api/src/index.ts:35-37`, `nuxt.config.ts:18` |

### P2 — Medium

| # | Risico | Bewijs |
|---|--------|--------|
| P2-1 | **README/DEPLOY verouderd** t.o.v. AI_CONTEXT | §8 |
| P2-2 | **Redis in docker-compose ongebruikt** | Alleen `docker-compose.yml` |
| P2-3 | **Testbestanden in `src/` breaking tsc build** | `flow-schema/tsconfig.json`, `flow-definition.test.ts` |
| P2-4 | **Smoke tests skippen silently** | `apps/api/src/smoke.test.ts:17-18` |
| P2-5 | **Node 26 lokaal vs engines >=20** | Mogelijke compatibiliteitsdrift |
| P2-6 | **OE niet in productie-deploy documentatie** | `DEPLOY.md` |
| P2-7 | **E2E niet verifieerbaar zonder Docker** | `e2e/global-setup.ts`, docker down |

### P3 — Laag / tech debt

| # | Risico | Bewijs |
|---|--------|--------|
| P3-1 | Merknaam inconsistent (Besliswijzer/Veraio/decision-engine) | Meerdere configs |
| P3-2 | Debug scripts zonder documentatie in README | `apps/api/src/scripts/debug-*` |
| P3-3 | Canvas referentie in AI_CONTEXT zonder bestand | §7.3 |
| P3-4 | `.env.example` duplicaat regel | Regels 15-16 |
| P3-5 | `@besliswijzer/db` zonder test script | "7 of 8 workspace projects" bij lint |
| P3-6 | User Cursor rules niet in repo | Alleen `update-documentation.mdc` versioned |

---

## 10. Vervolgtaken (klein, afzonderlijk uitvoerbaar)

Aanbevolen volgorde — **één taak per PR**, na elke wijziging lint/typecheck/test/build draaien.

### Fase A — Baseline afdwingen (week 1)

1. **A1.** WIP committen of stashen: inventariseer 106 files; splits in logical commits (product-schema package, API services, OE agents, web UI).
2. **A2.** Fix `flow-schema` test fixtures (`ctas: []`) en sluit testbestanden uit van `tsc` build (`exclude: ["**/*.test.ts"]` in tsconfig) — herhaal voor `apps/api`.
3. **A3.** Fix type errors in `apps/api/src/routes/admin.ts` (content block `source` defaults) en `apps/opportunity-engine` (`GenerateProductPageRequest` export).
4. **A4.** Fix `apps/web` typecheck errors (`convert-opportunity-flow.ts`, `QuestionRenderer.vue`; evalueer Nitro proxy type workaround).
5. **A5.** Voeg `@besliswijzer/product-schema build` toe aan `Dockerfile.api` en `Dockerfile.web`.
6. **A6.** Verifieer `pnpm lint && pnpm test && pnpm build` groen lokaal.

### Fase B — CI & database (week 1–2)

7. **B1.** GitHub Actions workflow: install → lint → test → build (Node 20, pnpm 9.15.0).
8. **B2.** Commit Drizzle migration `0002_product_pages.sql` + journal; draai `pnpm db:migrate` tegen dev DB.
9. **B3.** Normaliseer Prisma migraties: verwijder dubbele SQL; kies `migrate deploy` workflow; documenteer in OE README.
10. **B4.** Fix root `test:unit`: voeg `vitest` toe aan root `devDependencies` of verwijder script.

### Fase C — Security & deploy (week 2)

11. **C1.** OE authenticatie: shared secret header of alleen bind op localhost + verplicht via Nuxt proxy in prod.
12. **C2.** Beveilig `/api/gemini/chat`: admin-only of verwijderen uit productie build.
13. **C3.** Verwijder default `dev-admin-key` fallback in production (`NODE_ENV=production` guard).
14. **C4.** Documenteer OE deploy (Railway service #3 of sidecar) in `DEPLOY.md`.
15. **C5.** Verwijder ongebruikte Redis uit `docker-compose.yml` of implementeer caching.

### Fase D — Documentatie & cleanup (week 2–3)

16. **D1.** Update `README.md` structuur (OE, product-schema, scripts).
17. **D2.** Sync `AI_CONTEXT.md` met werkelijkheid; verwijder canvas referentie of voeg bestand toe.
18. **D3.** Version Cursor rules (TDD, workflow) in `.cursor/rules/` of documenteer dat ze user-level zijn.
19. **D4.** Verplaats debug scripts naar `scripts/debug/` met README; markeer als dev-only.
20. **D5.** E2E in CI met Postgres service container; fail hard als DB prep faalt.

---

## Bijlage A — Uitgevoerde commando's

```text
git status --short
git branch -v
git log -3 --oneline
git diff --stat HEAD

node -v                                    → v26.3.0
pnpm.cmd -v                                → 9.15.0

pnpm.cmd lint                              → FAIL (flow-schema ctas)
pnpm.cmd test                              → PASS (133 tests)
pnpm.cmd build                             → FAIL (flow-schema)
pnpm.cmd test:unit                         → FAIL (vitest not found)
pnpm.cmd --filter @besliswijzer/web lint   → FAIL (5 TS errors)
pnpm.cmd --filter @besliswijzer/api lint   → FAIL (3 TS errors)
pnpm.cmd --filter @veraio/opportunity-engine lint → FAIL (3 TS errors)
pnpm.cmd --filter @besliswijzer/db lint    → PASS
pnpm.cmd --filter @besliswijzer/flow-engine lint → PASS
pnpm.cmd --filter @besliswijzer/product-schema lint → PASS
pnpm.cmd --filter @veraio/opportunity-engine db:generate → FAIL (EPERM Windows)

docker ps                                  → FAIL (daemon not running)
```

## Bijlage B — Gewijzigde bestanden (audit)

| Bestand | Actie |
|---------|-------|
| `docs/repository-baseline-audit.md` | **Nieuw** (dit rapport) |

Geen andere bestanden gewijzigd tijdens R0.1.

## Bijlage C — Niet geverifieerd

| Item | Reden |
|------|-------|
| `pnpm db:migrate` / schema status op DB | Docker Desktop niet actief; geen `.env` |
| `pnpm db:seed` | Postgres niet bereikbaar |
| `pnpm dev` / service health | Niet gestart (langlopend + infra) |
| `pnpm test:e2e` | Playwright + Postgres + services vereist |
| Prisma migrate status | `db:generate` EPERM; geen DB |
| Productie Railway deploy | Geen toegang tot live omgeving |
| OE cron scheduler gedrag | Service niet gestart |
| Google Ads integratie (live) | `GOOGLE_KEYWORD_INSIGHT_MOCK=true` in example |

## Bijlage D — Blokkades

1. **PowerShell execution policy** — `pnpm.ps1` / `npx.ps1` geblokkeerd; workaround via `pnpm.cmd`.
2. **Docker Desktop niet actief** — geen lokale Postgres; DB-migraties en E2E niet verifieerbaar.
3. **Geen `.env`** — Prisma generate en services vereisen handmatige `cp .env.example .env`.
4. **Windows EPERM** — Prisma query engine rename faalde (file lock / antivirus).

---

*Einde rapport R0.1 — geen vervolgtaken geïmplementeerd.*
