# Working Tree Inventory — R0.2

**Project:** Veraio / Besliswijzer (`decision-engine`)  
**Datum:** 21 juli 2026  
**Branch:** `main` @ `9d432bd`  
**Baseline:** `docs/repository-baseline-audit.md` (R0.1)  
**Notion:** VER-10 — *R0.2 — Working tree inventariseren en opsplitsingsplan maken*

---

## 1. Samenvatting working tree

### 1.1 Aantallen

| Meting | Aantal | Toelichting |
|--------|--------|-------------|
| `git status --short` regels | **107** | 53 modified + 54 untracked *entries* (mappen tellen als 1 regel) |
| R0.1-referentie (Notion) | **106** | Telde vóór toevoeging `docs/repository-baseline-audit.md` |
| Uitgeklapte bestandspaden | **126** | 53 modified + 73 untracked bestanden (`git ls-files --others --exclude-standard`) |
| Diff omvang (tracked) | **+2778 / −385** | 53 bestanden (`git diff --stat HEAD`) |

**Verklaring verschil 106 → 107:** tijdens R0.1 is `docs/repository-baseline-audit.md` toegevoegd (+1 untracked entry `docs/`).

**Verklaring 107 → 126:** status toont mappen (`packages/product-schema/`, `content-blocks/`, `prisma/migrations/`, `clients/`, `product-pages/`, `.cursor/`, `docs/`) als enkele regel; `git ls-files --others` expandeert naar individuele bestanden.

### 1.2 Thematisch

Alle wijzigingen hangen samen rond **één grote feature-uitbreiding**:

> **Productpagina's** — block-based pagina's, productcatalogus, FAQ-routing vanuit Opportunity Engine, flow-merge per product, en admin/publieke UI.

Daarnaast: **documentatie**, **workspace-config**, **landing-page link-resolutie**, en **dev/debug/migratiescripts**.

### 1.3 Status per kwaliteitsgate (uit R0.1, niet opgelost in R0.2)

| Gate | Status |
|------|--------|
| `pnpm test` | ✅ 133 tests groen |
| `pnpm lint` | ❌ Faalt (flow-schema, api, web, OE) |
| `pnpm build` | ❌ Faalt (flow-schema testfixtures in tsc) |

Geen enkele commit-groep is deploy-ready zonder follow-up lint/build-fixes (R0.1 taken A2–A6).

---

## 2. Voorgestelde wijzigingsgroepen (overzicht)

| # | Groep | Bestanden | Status | Commit # |
|---|-------|-----------|--------|----------|
| G1 | Documentatie & Cursor rules | 3 | Compleet (inhoudelijk) | **1 — veiligste eerste commit** |
| G2 | Shared: `@besliswijzer/product-schema` | 12 | Compleet (tests ✅, lint ✅) | 2 |
| G3 | Shared: flow merge + hub engine | 5 | Compleet (tests ✅); lint/build ❌ door test-in-src | 3 |
| G4 | Database Drizzle (public schema) | 5 | Compleet logisch; migratie niet verified op DB | 4 |
| G5 | Workspace & lockfile config | 4 | Compleet | 5 |
| G6 | API — productpagina's & routing | 14 | Functioneel compleet; lint ❌ | 6 |
| G7 | API — flow merge & archivering | 5 | Compleet; operationeel risico | 7 |
| G8 | API — debug/migratiescripts | 3 | Dev-only; niet voor productie | 8 (optioneel apart) |
| G9 | OE — Prisma schema & migratie | 4 | Migratie aanwezig; lint ❌ deels | 9 |
| G10 | OE — product/FAQ agents & client | 22 | Functioneel compleet; lint ❌ op agent | 10 |
| G11 | OE — bestaande pipeline-aanpassingen | 14 | Compleet t.o.v. FAQ-routing | 11 |
| G12 | Web — content blocks & productpagina | 14 | UI compleet; typecheck ❌ deels | 12 |
| G13 | Web — flow utils & link-resolutie | 10 | Compleet (tests ✅); typecheck ❌ op convert | 13 |
| G14 | Web — admin opportunity pipeline | 5 | Grootste diff; incompleet typecheck | 14 |
| G15 | Web — landing & flow pagina's | 16 | Compleet; LandingCategories refactor onduidelijk scope | 15 |
| G16 | Web — proxies & types | 4 | Klein; afhankelijk van G6/G10 | 16 |
| G17 | R0.2 rapport (deze opdracht) | 1 | Compleet | na commit 1 of apart |

**Totaal gegroepeerde bestanden:** 126 + dit rapport (127 na R0.2).

---

## 3. Detail per groep

### G1 — Documentatie & Cursor rules

**Doel:** AI-/developer-context en documentatie-conventies versioneren zonder runtime-impact.

**Bestanden (3):**

| Bestand | Status |
|---------|--------|
| `.cursor/rules/update-documentation.mdc` | untracked |
| `AI_CONTEXT.md` | untracked |
| `docs/repository-baseline-audit.md` | untracked (R0.1) |

**Afhankelijkheden:** geen.

**Compleet?** ✅ Ja — zelfstandige documentatie.

**Risico's:** Laag. `AI_CONTEXT.md` beschrijft features die nog niet gecommit zijn → documentatie loopt voor op code tot latere commits.

**Validatie:** diff review; geen build/test nodig.

**Commitbericht:** `docs: add AI context, baseline audit, and Cursor documentation rule`

**Commitvolgorde:** **#1 — veiligste eerste commit**

---

### G2 — Shared: `@besliswijzer/product-schema`

**Doel:** Single source of truth voor producten, productpagina's, content blocks, keyword matching, flow groups.

**Bestanden (12):**

```
packages/product-schema/package.json
packages/product-schema/tsconfig.json
packages/product-schema/vitest.config.ts
packages/product-schema/src/index.ts
packages/product-schema/src/product.ts
packages/product-schema/src/product-page.ts
packages/product-schema/src/content-block.ts
packages/product-schema/src/product-matcher.ts
packages/product-schema/src/product-matcher.test.ts
packages/product-schema/src/product-flow-group.ts
packages/product-schema/src/product-flow-group.test.ts
packages/product-schema/src/product-schema.test.ts
```

**Afhankelijkheden:** geen (foundation package). **Vereist door:** G4, G6, G10, G12, G13.

**Compleet?** ✅ Ja — 8 tests groen, lint groen (R0.1).

**Risico's:** Medium — `Dockerfile.api` / `Dockerfile.web` bouwen dit package nog niet (R0.1 P0-2). Commit vóór Dockerfile-fix blokkeert deploy.

**Validatie:** `pnpm --filter @besliswijzer/product-schema test lint build`

**Commitbericht:** `feat(product-schema): add shared product, page, and content block types`

**Commitvolgorde:** #2

---

### G3 — Shared: flow merge + hub engine

**Doel:** Flows mergen (`mergeFlowDefinitions`) en hub/intent-entry nodes in flow-engine.

**Bestanden (5):**

| Bestand | Status | Diff |
|---------|--------|------|
| `packages/flow-schema/src/merge-flow-definitions.ts` | untracked | nieuw |
| `packages/flow-schema/src/merge-flow-definitions.test.ts` | untracked | nieuw |
| `packages/flow-schema/src/index.ts` | modified | +2 exports |
| `packages/flow-engine/src/index.ts` | modified | +110 regels |
| `packages/flow-engine/src/index.test.ts` | modified | +76 regels |

**Afhankelijkheden:** G2 (product-flow-group conceptueel gerelateerd). **Vereist door:** G6 (merge services), G7, G10 (product-flow agent).

**Compleet?** ⚠️ Functioneel ja (tests ✅); **lint/build ❌** — `flow-definition.test.ts` (gecommit) mist `ctas` in fixtures; nieuwe tests OK.

**Risico's:** Hoog voor CI/build — `tsc` compileert `*.test.ts` in `src/`. Fix in aparte stabilisatie-commit (R0.1 A2), niet in deze inventarisatie.

**Validatie:** `pnpm --filter @besliswijzer/flow-schema test`; `pnpm --filter @besliswijzer/flow-engine test`

**Commitbericht:** `feat(flow): add mergeFlowDefinitions and hub entry node support`

**Commitvolgorde:** #3

---

### G4 — Database Drizzle (public schema)

**Doel:** Tabellen `products`, `product_pages`, `product_keywords` + migratie + seed.

**Bestanden (5):**

| Bestand | Status |
|---------|--------|
| `packages/db/src/schema.ts` | modified (+65) |
| `packages/db/drizzle/0002_product_pages.sql` | untracked |
| `packages/db/drizzle/meta/_journal.json` | modified |
| `packages/db/package.json` | modified (`seed:product-page` script) |
| `packages/db/src/seed-product-page.ts` | untracked |

**Afhankelijkheden:** G2 (types alignen met schema). **Vereist door:** G6.

**Compleet?** ✅ Logisch compleet; **DB niet gemigreerd** tijdens audit (Docker down).

**Risico's:** Hoog — untracked migratie; productie-schema mismatch als deploy vóór migratie. Altijd `0002` + `_journal.json` in dezelfde commit.

**Validatie:** `pnpm --filter @besliswijzer/db lint`; `pnpm db:migrate` + `pnpm db:seed:product-page` (met Postgres)

**Commitbericht:** `feat(db): add product pages schema, migration, and seed script`

**Commitvolgorde:** #4 (direct na G2/G3)

---

### G5 — Workspace & lockfile config

**Doel:** Root scripts, vitest workspace, env template, lockfile voor nieuwe packages.

**Bestanden (4):**

| Bestand | Status | Wijziging |
|---------|--------|-----------|
| `package.json` | modified | `db:seed:product-page`, `migrate:merge-product-flows` |
| `pnpm-lock.yaml` | modified | workspace deps |
| `vitest.workspace.ts` | modified | +product-schema |
| `.env.example` | modified | OE vars; **duplicaat** `BESLIJSWIJZER_API_BASE` (regels 15–16) |

**Afhankelijkheden:** G2 (product-schema in lockfile). **Vereist door:** G6–G11.

**Compleet?** ⚠️ Bijna — duplicaat env-regel opschonen in latere stabilisatie-commit.

**Risico's:** Laag-middel — lockfile moet synchroon met package.json commits.

**Validatie:** `pnpm install`; diff review `.env.example`

**Commitbericht:** `chore: update workspace scripts, vitest config, and env example`

**Commitvolgorde:** #5 (kan samen met G2 lockfile-deel; bij voorkeur na G2)

---

### G6 — API: productpagina's & publieke endpoints

**Doel:** CRUD productpagina's, FAQ append, product matching, publieke page/flow-link endpoints.

**Bestanden (14):**

| Bestand | Status |
|---------|--------|
| `apps/api/package.json` | modified (+product-schema dep) |
| `apps/api/src/index.ts` | modified |
| `apps/api/src/routes/admin.ts` | modified (+281) |
| `apps/api/src/routes/public.ts` | modified (+23) |
| `apps/api/src/services/product-page-service.ts` | untracked |
| `apps/api/src/services/product-page-service.test.ts` | untracked |
| `apps/api/src/services/product-router-service.ts` | untracked |
| `apps/api/src/services/flow-catalog-service.ts` | untracked |
| `apps/api/src/services/flow-admin-service.ts` | untracked |
| `apps/api/src/services/category-service.ts` | modified |
| `apps/api/src/services/flow-service.ts` | modified |

**Afhankelijkheden:** G2, G4 verplicht. **Vereist door:** G8 (client), G10, G12, G14.

**Compleet?** ⚠️ Functioneel ja (3 service tests ✅); **lint ❌** admin.ts contentBlock type mismatch.

**Risico's:** Hoog — groot admin.ts diff; merge conflicts waarschijnlijk bij parallel werk.

**Validatie:** `pnpm --filter @besliswijzer/api test`; handmatig admin endpoints; lint na fix

**Commitbericht:** `feat(api): add product page CRUD, routing, and public page endpoints`

**Commitvolgorde:** #6

---

### G7 — API: flow merge & archivering

**Doel:** Keyword-flows mergen tot hub-flow per product; verouderde flows archiveren.

**Bestanden (5):**

| Bestand | Status |
|---------|--------|
| `apps/api/src/services/merge-product-flows-service.ts` | untracked |
| `apps/api/src/services/archive-product-flows-service.ts` | untracked |
| `apps/api/src/services/archive-product-flows-service.test.ts` | untracked |
| `apps/api/src/scripts/migrate-merge-product-flows.ts` | untracked |
| *(root script al in G5)* | `migrate:merge-product-flows` |

**Afhankelijkheden:** G3, G6. **Vereist door:** G14 (admin UI merge-knoppen).

**Compleet?** ✅ Tests groen (2 archive tests). Script is **data-mutating**.

**Risico's:** **Zeer hoog** voor `migrate-merge-product-flows.ts` — wijzigt productie-flows. Alleen dev/staging; niet in productie-deploy bundle zonder safeguards.

**Validatie:** `pnpm --filter @besliswijzer/api test`; `--dry-run` op migratiescript

**Commitbericht:** `feat(api): add product flow merge and archive services`

**Commitvolgorde:** #7

---

### G8 — API: debug scripts (tijdelijk)

**Doel:** Handmatige debug tijdens productpagina-ontwikkeling.

**Bestanden (2):**

| Bestand | Status |
|---------|--------|
| `apps/api/src/scripts/debug-product-match.ts` | untracked |
| `apps/api/src/scripts/debug-robotstofzuiger-page.ts` | untracked |

**Afhankelijkheden:** G6.

**Compleet?** ✅ Dev-hulpmiddelen; **horen waarschijnlijk niet in productie**.

**Risico's:** Medium — hardcoded testcases (`robotstofzuiger`); verwarring voor toekomstige devs.

**Validatie:** geen CI; optioneel `tsx` handmatig

**Commitbericht:** `chore(api): add dev debug scripts for product matching` *(of: niet committen; verplaatsen naar `scripts/debug/`)*

**Commitvolgorde:** #8 — **optioneel**, laatste of aparte “dev tooling” PR

**Aanbeveling:** Niet in dezelfde PR als G6; overweeg `.gitignore` of `scripts/debug/` + README (R0.1 D4).

---

### G9 — OE: Prisma schema & migratie

**Doel:** `ROUTED_TO_PRODUCT` status, `faqItem`, `routedPageSlug` in opportunity schema.

**Bestanden (4):**

| Bestand | Status |
|---------|--------|
| `apps/opportunity-engine/prisma/schema.prisma` | modified |
| `apps/opportunity-engine/prisma/migrations/migration_lock.toml` | untracked |
| `apps/opportunity-engine/prisma/migrations/20260715_route_to_product/migration.sql` | untracked |
| `apps/opportunity-engine/package.json` | modified (+product-schema dep) |

**Afhankelijkheden:** geen. **Vereist door:** G10, G11.

**Compleet?** ⚠️ Migratie map aanwezig; OE README noemt nog `db:push` — workflow dubbel.

**Risico's:** Hoog — schema + migratie moeten atomair; Prisma `migrate deploy` vs push inconsistentie.

**Validatie:** `pnpm --filter @veraio/opportunity-engine db:generate`; migrate tegen dev DB

**Commitbericht:** `feat(oe): add FAQ routing fields and Prisma migration`

**Commitvolgorde:** #9

---

### G10 — OE: product/FAQ agents, client & nieuwe controllers

**Doel:** AI productpagina/flow generatie, FAQ prompts, Besliswijzer API client, nieuwe HTTP controllers.

**Bestanden (22):**

```
apps/opportunity-engine/src/clients/besliswijzer-api.client.ts
apps/opportunity-engine/src/api/controllers/product-page.controller.ts
apps/opportunity-engine/src/api/controllers/product-flow.controller.ts
apps/opportunity-engine/src/api/controllers/product-keywords.controller.ts
apps/opportunity-engine/src/prompts/generate-faq.prompt.ts
apps/opportunity-engine/src/prompts/generate-product-flow.prompt.ts
apps/opportunity-engine/src/prompts/generate-product-page.prompt.ts
apps/opportunity-engine/src/prompts/generate-product-page.prompt.test.ts
apps/opportunity-engine/src/models/product-page-content.ts
apps/opportunity-engine/src/models/product-page-content.test.ts
apps/opportunity-engine/src/services/product-page-content.agent.ts
apps/opportunity-engine/src/services/product-page-content.agent.test.ts
apps/opportunity-engine/src/services/product-flow.agent.ts
apps/opportunity-engine/src/services/product-flow.agent.test.ts
apps/opportunity-engine/src/services/product-keywords.service.ts
apps/opportunity-engine/src/services/product-router.service.ts
apps/opportunity-engine/src/services/product-router.service.test.ts
apps/opportunity-engine/src/providers/ai/ai-provider.interface.test.ts
apps/opportunity-engine/src/api/routes.ts          (modified, +38)
apps/opportunity-engine/src/container.ts           (modified)
apps/opportunity-engine/src/index.ts               (modified)
apps/opportunity-engine/src/config/index.ts        (modified)
```

**Afhankelijkheden:** G2, G6 (API endpoints), G9. **Vereist door:** G11, G14.

**Compleet?** ⚠️ Tests ✅ (44 totaal OE); **lint ❌** `product-page-content.agent.ts` (`GenerateProductPageRequest` export ontbreekt).

**Risico's:** Hoog — OE endpoints zonder auth (R0.1 P0-4); AI-kosten bij directe exposure.

**Validatie:** `pnpm --filter @veraio/opportunity-engine test`; lint na fix

**Commitbericht:** `feat(oe): add product page agents, FAQ routing, and Besliswijzer API client`

**Commitvolgorde:** #10

---

### G11 — OE: bestaande pipeline-aanpassingen

**Doel:** Discovery auto-route FAQ, opportunity service/repository uitbreidingen, schema's, AI interface.

**Bestanden (14):**

| Bestand | Status |
|---------|--------|
| `apps/opportunity-engine/README.md` | modified |
| `apps/opportunity-engine/src/api/controllers/opportunity.controller.ts` | modified |
| `apps/opportunity-engine/src/models/schemas.ts` | modified (+89) |
| `apps/opportunity-engine/src/models/schemas.test.ts` | modified |
| `apps/opportunity-engine/src/providers/ai/ai-provider.interface.ts` | modified |
| `apps/opportunity-engine/src/repositories/opportunity.repository.ts` | modified |
| `apps/opportunity-engine/src/services/discovery.service.ts` | modified |
| `apps/opportunity-engine/src/services/opportunity.service.ts` | modified |
| `apps/opportunity-engine/src/services/prompt-builder.service.ts` | modified |

**Afhankelijkheden:** G9, G10. Kan samengevoegd met G10 in één PR indien gewenst.

**Compleet?** ✅ Ja t.o.v. FAQ-routing feature.

**Risico's:** Medium — discovery cron kan auto FAQ-routing triggeren (`DISCOVERY_AUTO_ROUTE_FAQ=5`).

**Validatie:** `pnpm --filter @veraio/opportunity-engine test`; discovery dry-run in dev

**Commitbericht:** `feat(oe): extend discovery pipeline for FAQ routing to product pages`

**Commitvolgorde:** #11 (of merge met #10)

---

### G12 — Web: content blocks & productpagina UI

**Doel:** Block registry, publieke `/{slug}` pagina, admin product-pages overzicht/preview.

**Bestanden (14):**

```
apps/web/components/content-blocks/registry.ts
apps/web/components/content-blocks/HeroBlock.vue
apps/web/components/content-blocks/IntroBlock.vue
apps/web/components/content-blocks/FlowBlock.vue
apps/web/components/content-blocks/FAQBlock.vue
apps/web/components/content-blocks/ProductPageRenderer.vue
apps/web/components/content-blocks/UnsupportedBlock.vue
apps/web/composables/useBlockRegistry.ts
apps/web/composables/useProductPageSeo.ts
apps/web/pages/[slug].vue
apps/web/pages/admin/product-pages/index.vue
apps/web/pages/admin/product-pages/[slug]/preview.vue
apps/web/components/admin/AdminLayout.vue          (modified, nav link)
apps/web/package.json                              (modified, +product-schema)
```

**Afhankelijkheden:** G2, G6. **Vereist door:** G14 (admin pipeline UI).

**Compleet?** ✅ UI-compleet; SSR/SEO via `useProductPageSeo`.

**Risico's:** Medium — `[slug].vue` kan conflicteren met bestaande routes; routing volgorde in Nuxt kritisch.

**Validatie:** handmatig `/warmtepomp` e.d.; `pnpm --filter @besliswijzer/web test`

**Commitbericht:** `feat(web): add content block renderer and public product pages`

**Commitvolgorde:** #12

---

### G13 — Web: flow utils & link-resolutie

**Doel:** Flow → productpagina URL mapping, opportunity flow conversie, landing categories util.

**Bestanden (10):**

```
apps/web/utils/resolve-flow-href.ts
apps/web/utils/resolve-flow-href.test.ts
apps/web/utils/resolve-flow-category.ts
apps/web/utils/resolve-flow-category.test.ts
apps/web/utils/convert-opportunity-flow.ts
apps/web/utils/convert-opportunity-flow.test.ts
apps/web/utils/group-opportunities-by-product.ts
apps/web/utils/group-opportunities-by-product.test.ts
apps/web/utils/landing-categories.ts
apps/web/utils/landing-categories.test.ts
apps/web/composables/useFlowPageLinks.ts
```

*(11 bestanden — useFlowPageLinks telt mee)*

**Afhankelijkheden:** G2, G6 (page-links API). **Vereist door:** G15.

**Compleet?** ⚠️ Tests ✅; **typecheck ❌** op `convert-opportunity-flow.ts`.

**Risico's:** Medium — link-resolutie beïnvloedt alle flow-URLs sitewide.

**Validatie:** `pnpm --filter @besliswijzer/web test`; typecheck na fix

**Commitbericht:** `feat(web): add flow href resolution and opportunity flow conversion utils`

**Commitvolgorde:** #13

---

### G14 — Web: admin opportunity pipeline

**Doel:** Uitgebreide admin UI voor discover, generate, import, publish, route, product pages.

**Bestanden (5):**

| Bestand | Status | Diff |
|---------|--------|------|
| `apps/web/composables/useOpportunityEngine.ts` | modified | **+753 regels** |
| `apps/web/pages/admin/opportunities.vue` | modified | **+622 regels** |
| `apps/web/pages/admin/index.vue` | modified | +115 |
| `apps/web/components/opportunity/DiscoveryPipeline.vue` | modified | klein |
| `apps/web/types/opportunity.ts` | modified | +13 |

**Afhankelijkheden:** G6, G10, G11, G12, G13, G7.

**Compleet?** ⚠️ Grootste WIP-blok; waarschijnlijk feature-compleet maar **typecheck niet verified**.

**Risico's:** **Zeer hoog** — moeilijk te reviewen monolith; regressie in bestaande opportunity workflow.

**Validatie:** handmatig admin pipeline; e2e `opportunities.spec.ts` (met Postgres)

**Commitbericht:** `feat(web): expand admin opportunity pipeline for product pages and FAQ routing`

**Commitvolgorde:** #14 — overweeg splits in 2 commits: composable eerst, dan UI

**Splits-advies:**

- #14a: `useOpportunityEngine.ts` + `types/opportunity.ts`
- #14b: `opportunities.vue` + `admin/index.vue` + `DiscoveryPipeline.vue`

---

### G15 — Web: landing & flow pagina's

**Doel:** Landing components updaten voor productpagina-links; flow wizard/page tweaks.

**Bestanden (16):**

| Bestand | Status |
|---------|--------|
| `apps/web/components/landing/HeroFlowSnippet.vue` | modified |
| `apps/web/components/landing/LandingAiAdviceCard.vue` | modified |
| `apps/web/components/landing/LandingCategories.vue` | modified (**467 regels refactor**) |
| `apps/web/components/landing/LandingExamples.vue` | modified |
| `apps/web/components/landing/LandingFlowSearch.vue` | modified |
| `apps/web/components/landing/LandingHero.vue` | modified |
| `apps/web/components/landing/LandingPopularFlows.vue` | modified |
| `apps/web/components/landing/LandingSampleAdvice.vue` | modified |
| `apps/web/pages/index.vue` | modified |
| `apps/web/pages/categorie/[slug].vue` | modified |
| `apps/web/pages/flows/[slug]/index.vue` | modified |
| `apps/web/pages/flows/[slug]/result/[key].vue` | modified |
| `apps/web/components/flow/Wizard.vue` | modified |

**Afhankelijkheden:** G13 (`resolveFlowHref`, `useFlowPageLinks`).

**Compleet?** ⚠️ `LandingCategories.vue` refactor scope **onduidelijk** — deels nieuwe util (`landing-categories.ts`), deels layout-redesign.

**Risico's:** Medium — visuele regressies landing; SEO links.

**Validatie:** visueel review `/`; `landing-categories.test.ts`; e2e `home.spec.ts`

**Commitbericht:** `feat(web): route landing and flow links through product pages`

**Commitvolgorde:** #15

---

### G16 — Web: server proxies & types

**Doel:** Admin/opportunity proxy kleine fixes; package dependency.

**Bestanden (4):**

| Bestand | Status |
|---------|--------|
| `apps/web/server/api/admin/[...path].ts` | modified |
| `apps/web/server/api/opportunity/[...path].ts` | modified |
| *(package.json reeds G12)* | — |

**Afhankelijkheden:** G6, G10.

**Compleet?** ✅ Klein diff.

**Risico's:** Laag.

**Validatie:** admin API calls via proxy

**Commitbericht:** kan merged in G12/G14 — `fix(web): update admin and opportunity API proxies`

**Commitvolgorde:** #16 (of opnemen in #12/#14)

---

### G17 — R0.2 rapport

**Bestand:** `docs/working-tree-inventory.md` (dit document)

**Commitbericht:** `docs: add working tree inventory and commit split plan (R0.2)`

**Commitvolgorde:** Direct na R0.2 review, vóór feature-commits of als apart docs-only PR.

---

## 4. Onduidelijke bestanden

| Bestand | Vraag |
|---------|-------|
| `apps/web/components/landing/LandingCategories.vue` | Is de grote refactor puur link-resolutie, of ook UX-redesign buiten productpagina-scope? |
| `apps/api/src/services/flow-catalog-service.ts` | Wordt dit gebruikt door landing refactor of alleen admin? Geen direct test. |
| `apps/opportunity-engine/src/services/product-router.service.ts` vs `apps/api/.../product-router-service.ts` | Bewuste duplicatie (OE routing vs API matching) — documenteer grens in AI_CONTEXT. |
| `docs/repository-baseline-audit.md` | In G1 committen vóór of na feature-commits? (inhoud beschrijft uncommitted state) |

---

## 5. Mogelijke gegenereerde bestanden (niet committen)

| Patroon | Status in working tree |
|---------|------------------------|
| `dist/` | ✅ Niet untracked (.gitignore) |
| `.nuxt/` | ✅ Niet untracked (.gitignore) |
| `node_modules/.vite/` | ✅ Niet in status (gitignore) |
| `packages/product-schema/dist/` | ✅ Afwezig — nog niet gebouwd |
| `packages/*/dist/` (bestaande packages) | Gecommit of gitignored; geen wijziging in status |

**Conclusie:** geen build artifacts in de working tree die per ongeluk gecommit moeten worden.

---

## 6. Conflicterende of dubbele implementaties

| Onderwerp | Locaties | Beoordeling |
|-----------|----------|-------------|
| Product routing | API `product-router-service.ts` + OE `product-router.service.ts` | Acceptabel — verschillende lagen; zelfde domeinnaam verwarrend |
| Flow merge | `flow-schema/merge-flow-definitions.ts` + `product-schema/product-flow-group.ts` | Complementair — merge vs grouping; tests in beide packages |
| Prisma setup | README `db:push` vs `prisma/migrations/` | **Conflict** — kies één workflow vóór commit G9 |
| FAQ generatie | `prompts/generate-faq.prompt.ts` (untracked) + wijzigingen `opportunity.service.ts` | Intentioneel — prompt los van service |
| Documentatie vs code | `AI_CONTEXT.md` vs `README.md` | AI_CONTEXT vooruit; README achter |

---

## 7. Wijzigingen die eerst gesplitst moeten worden

| Wijziging | Reden |
|-----------|-------|
| `useOpportunityEngine.ts` + `opportunities.vue` | Te groot voor één review (~1400 regels diff) → 14a/14b |
| `admin.ts` (+281) | Overweeg split: product-page routes vs overige admin wijzigingen |
| G8 debug scripts | Split van G6 productie-API code |
| G1 documentatie | Split van feature code — **eerste commit** |
| Lint/build fixes | Aparte stabilisatie-PR (R0.1 A2–A6), niet vermengen met feature commits |

---

## 8. Wijzigingen die waarschijnlijk niet in productie horen

| Item | Groep | Aanbeveling |
|------|-------|-------------|
| `debug-product-match.ts` | G8 | Dev-only; niet deployen |
| `debug-robotstofzuiger-page.ts` | G8 | Dev-only; product-specifiek |
| `migrate-merge-product-flows.ts` | G7 | CLI tool; alleen bewust op staging/prod draaien |
| `/api/gemini/chat` | *(gecommit)* | Bestaand; niet in deze WIP — blijft security-risico (R0.1) |
| Default `dev-admin-key` | *(gecommit + env)* | Alleen dev; prod guard nodig (R0.1 C3) |

---

## 9. Aanbevolen commitvolgorde (samenvatting)

```
 #1  G1  Documentatie & Cursor rules                    ← VEILIGSTE EERSTE COMMIT
 #2  G2  product-schema package
 #3  G3  flow merge + hub engine
 #4  G4  Drizzle schema + migratie
 #5  G5  Workspace config + lockfile
 #6  G6  API product pages
 #7  G7  API flow merge/archive
 #8  G8  Debug scripts (optioneel, apart PR)
 #9  G9  OE Prisma migratie
#10  G10  OE agents + client + controllers
#11  G11  OE pipeline aanpassingen (of merge #10)
#12  G12  Web content blocks + product pages
#13  G13  Web flow utils
#14a G14  useOpportunityEngine + types
#14b G14  admin opportunities UI
#15  G15  Landing + flow pages
#16  G16  Web proxies (kan in #12/#14)
 ---  G17  docs/working-tree-inventory.md (R0.2)
 ---  Stabilisatie PR: lint/build fixes (R0.1 A2–A6) — NA feature commits of tussendoor per package
```

### Veiligste eerste commit

> **Commit #1 — G1:** `.cursor/rules/update-documentation.mdc`, `AI_CONTEXT.md`, `docs/repository-baseline-audit.md`

**Waarom:**

- Geen runtime- of build-impact
- Geen database-migraties
- Geen broken lint/typecheck in deze bestanden
- Maakt review-context beschikbaar voor alle volgende PRs
- Minimaal regressierisico

**Niet als eerste:** G2/G3 (andere packages dependen erop maar lint/build faalt al op bestaande code), G4 (database), G6 (grote API surface).

---

## 10. Validatie per commit (kort)

| Commit | Minimale validatie |
|--------|-------------------|
| #1 | Document review |
| #2 | `pnpm --filter @besliswijzer/product-schema test lint build` |
| #3 | flow-schema + flow-engine tests |
| #4 | db lint + `pnpm db:migrate` op dev DB |
| #5 | `pnpm install` |
| #6–7 | api tests; handmatig admin/public endpoints |
| #8 | geen CI |
| #9–11 | oe tests; prisma migrate dev |
| #12–16 | web tests; typecheck (na fixes); e2e subset |
| Stabilisatie | `pnpm lint && pnpm test && pnpm build` |

---

## 11. Volledige checklist: alle `git status --short` items

Elke regel hieronder is gekoppeld aan een groep. **107/107 accounted.**

### Modified (53)

| # | Status regel | Groep |
|---|--------------|-------|
| 1 | `M .env.example` | G5 |
| 2 | `M apps/api/package.json` | G6 |
| 3 | `M apps/api/src/index.ts` | G6 |
| 4 | `M apps/api/src/routes/admin.ts` | G6 |
| 5 | `M apps/api/src/routes/public.ts` | G6 |
| 6 | `M apps/api/src/services/category-service.ts` | G6 |
| 7 | `M apps/api/src/services/flow-service.ts` | G6 |
| 8 | `M apps/opportunity-engine/README.md` | G11 |
| 9 | `M apps/opportunity-engine/package.json` | G9 |
| 10 | `M apps/opportunity-engine/prisma/schema.prisma` | G9 |
| 11 | `M apps/opportunity-engine/src/api/controllers/opportunity.controller.ts` | G11 |
| 12 | `M apps/opportunity-engine/src/api/routes.ts` | G10 |
| 13 | `M apps/opportunity-engine/src/config/index.ts` | G10 |
| 14 | `M apps/opportunity-engine/src/container.ts` | G10 |
| 15 | `M apps/opportunity-engine/src/index.ts` | G10 |
| 16 | `M apps/opportunity-engine/src/models/schemas.test.ts` | G11 |
| 17 | `M apps/opportunity-engine/src/models/schemas.ts` | G11 |
| 18 | `M apps/opportunity-engine/src/providers/ai/ai-provider.interface.ts` | G11 |
| 19 | `M apps/opportunity-engine/src/repositories/opportunity.repository.ts` | G11 |
| 20 | `M apps/opportunity-engine/src/services/discovery.service.ts` | G11 |
| 21 | `M apps/opportunity-engine/src/services/opportunity.service.ts` | G11 |
| 22 | `M apps/opportunity-engine/src/services/prompt-builder.service.ts` | G11 |
| 23 | `M apps/web/components/admin/AdminLayout.vue` | G12 |
| 24 | `M apps/web/components/flow/Wizard.vue` | G15 |
| 25 | `M apps/web/components/landing/HeroFlowSnippet.vue` | G15 |
| 26 | `M apps/web/components/landing/LandingAiAdviceCard.vue` | G15 |
| 27 | `M apps/web/components/landing/LandingCategories.vue` | G15 |
| 28 | `M apps/web/components/landing/LandingExamples.vue` | G15 |
| 29 | `M apps/web/components/landing/LandingFlowSearch.vue` | G15 |
| 30 | `M apps/web/components/landing/LandingHero.vue` | G15 |
| 31 | `M apps/web/components/landing/LandingPopularFlows.vue` | G15 |
| 32 | `M apps/web/components/landing/LandingSampleAdvice.vue` | G15 |
| 33 | `M apps/web/components/opportunity/DiscoveryPipeline.vue` | G14 |
| 34 | `M apps/web/composables/useOpportunityEngine.ts` | G14 |
| 35 | `M apps/web/package.json` | G12 |
| 36 | `M apps/web/pages/admin/index.vue` | G14 |
| 37 | `M apps/web/pages/admin/opportunities.vue` | G14 |
| 38 | `M apps/web/pages/categorie/[slug].vue` | G15 |
| 39 | `M apps/web/pages/flows/[slug]/index.vue` | G15 |
| 40 | `M apps/web/pages/flows/[slug]/result/[key].vue` | G15 |
| 41 | `M apps/web/pages/index.vue` | G15 |
| 42 | `M apps/web/server/api/admin/[...path].ts` | G16 |
| 43 | `M apps/web/server/api/opportunity/[...path].ts` | G16 |
| 44 | `M apps/web/types/opportunity.ts` | G14 |
| 45 | `M package.json` | G5 |
| 46 | `M packages/db/drizzle/meta/_journal.json` | G4 |
| 47 | `M packages/db/package.json` | G4 |
| 48 | `M packages/db/src/schema.ts` | G4 |
| 49 | `M packages/flow-engine/src/index.test.ts` | G3 |
| 50 | `M packages/flow-engine/src/index.ts` | G3 |
| 51 | `M packages/flow-schema/src/index.ts` | G3 |
| 52 | `M pnpm-lock.yaml` | G5 |
| 53 | `M vitest.workspace.ts` | G5 |

### Untracked entries (54)

| # | Status regel | Groep | Uitgeklapte bestanden |
|---|--------------|-------|----------------------|
| 54 | `?? .cursor/` | G1 | 1: `update-documentation.mdc` |
| 55 | `?? AI_CONTEXT.md` | G1 | 1 |
| 56 | `?? apps/api/src/scripts/debug-product-match.ts` | G8 | 1 |
| 57 | `?? apps/api/src/scripts/debug-robotstofzuiger-page.ts` | G8 | 1 |
| 58 | `?? apps/api/src/scripts/migrate-merge-product-flows.ts` | G7 | 1 |
| 59 | `?? apps/api/src/services/archive-product-flows-service.test.ts` | G7 | 1 |
| 60 | `?? apps/api/src/services/archive-product-flows-service.ts` | G7 | 1 |
| 61 | `?? apps/api/src/services/flow-admin-service.ts` | G6 | 1 |
| 62 | `?? apps/api/src/services/flow-catalog-service.ts` | G6 | 1 |
| 63 | `?? apps/api/src/services/merge-product-flows-service.ts` | G7 | 1 |
| 64 | `?? apps/api/src/services/product-page-service.test.ts` | G6 | 1 |
| 65 | `?? apps/api/src/services/product-page-service.ts` | G6 | 1 |
| 66 | `?? apps/api/src/services/product-router-service.ts` | G6 | 1 |
| 67 | `?? apps/opportunity-engine/prisma/migrations/` | G9 | 2: `migration_lock.toml`, `20260715_route_to_product/migration.sql` |
| 68 | `?? apps/opportunity-engine/src/api/controllers/product-flow.controller.ts` | G10 | 1 |
| 69 | `?? apps/opportunity-engine/src/api/controllers/product-keywords.controller.ts` | G10 | 1 |
| 70 | `?? apps/opportunity-engine/src/api/controllers/product-page.controller.ts` | G10 | 1 |
| 71 | `?? apps/opportunity-engine/src/clients/` | G10 | 1: `besliswijzer-api.client.ts` |
| 72 | `?? apps/opportunity-engine/src/models/product-page-content.test.ts` | G10 | 1 |
| 73 | `?? apps/opportunity-engine/src/models/product-page-content.ts` | G10 | 1 |
| 74 | `?? apps/opportunity-engine/src/prompts/generate-faq.prompt.ts` | G10 | 1 |
| 75 | `?? apps/opportunity-engine/src/prompts/generate-product-flow.prompt.ts` | G10 | 1 |
| 76 | `?? apps/opportunity-engine/src/prompts/generate-product-page.prompt.test.ts` | G10 | 1 |
| 77 | `?? apps/opportunity-engine/src/prompts/generate-product-page.prompt.ts` | G10 | 1 |
| 78 | `?? apps/opportunity-engine/src/providers/ai/ai-provider.interface.test.ts` | G10 | 1 |
| 79 | `?? apps/opportunity-engine/src/services/product-flow.agent.test.ts` | G10 | 1 |
| 80 | `?? apps/opportunity-engine/src/services/product-flow.agent.ts` | G10 | 1 |
| 81 | `?? apps/opportunity-engine/src/services/product-keywords.service.ts` | G10 | 1 |
| 82 | `?? apps/opportunity-engine/src/services/product-page-content.agent.test.ts` | G10 | 1 |
| 83 | `?? apps/opportunity-engine/src/services/product-page-content.agent.ts` | G10 | 1 |
| 84 | `?? apps/opportunity-engine/src/services/product-router.service.test.ts` | G10 | 1 |
| 85 | `?? apps/opportunity-engine/src/services/product-router.service.ts` | G10 | 1 |
| 86 | `?? apps/web/components/content-blocks/` | G12 | 7: registry + 5 blocks + UnsupportedBlock |
| 87 | `?? apps/web/composables/useBlockRegistry.ts` | G12 | 1 |
| 88 | `?? apps/web/composables/useFlowPageLinks.ts` | G13 | 1 |
| 89 | `?? apps/web/composables/useProductPageSeo.ts` | G12 | 1 |
| 90 | `?? apps/web/pages/[slug].vue` | G12 | 1 |
| 91 | `?? apps/web/pages/admin/product-pages/` | G12 | 2: index.vue, preview.vue |
| 92 | `?? apps/web/utils/convert-opportunity-flow.test.ts` | G13 | 1 |
| 93 | `?? apps/web/utils/convert-opportunity-flow.ts` | G13 | 1 |
| 94 | `?? apps/web/utils/group-opportunities-by-product.test.ts` | G13 | 1 |
| 95 | `?? apps/web/utils/group-opportunities-by-product.ts` | G13 | 1 |
| 96 | `?? apps/web/utils/landing-categories.test.ts` | G13 | 1 |
| 97 | `?? apps/web/utils/landing-categories.ts` | G13 | 1 |
| 98 | `?? apps/web/utils/resolve-flow-category.test.ts` | G13 | 1 |
| 99 | `?? apps/web/utils/resolve-flow-category.ts` | G13 | 1 |
| 100 | `?? apps/web/utils/resolve-flow-href.test.ts` | G13 | 1 |
| 101 | `?? apps/web/utils/resolve-flow-href.ts` | G13 | 1 |
| 102 | `?? docs/` | G1 + G17 | 1 nu: `repository-baseline-audit.md`; +1 na R0.2 |
| 103 | `?? packages/db/drizzle/0002_product_pages.sql` | G4 | 1 |
| 104 | `?? packages/db/src/seed-product-page.ts` | G4 | 1 |
| 105 | `?? packages/flow-schema/src/merge-flow-definitions.test.ts` | G3 | 1 |
| 106 | `?? packages/flow-schema/src/merge-flow-definitions.ts` | G3 | 1 |
| 107 | `?? packages/product-schema/` | G2 | 12 bestanden (hele package) |

**Som uitgeklapte untracked bestanden:** 73 (exclusief `working-tree-inventory.md` dat in R0.2 wordt toegevoegd).

---

## 12. Open vragen

1. **Commitstrategie documentatie:** `AI_CONTEXT.md` beschrijft uncommitted features — committen vóór (G1) of na feature-PRs?
2. **Debug scripts (G8):** committen in repo of alleen lokaal houden?
3. **Prisma workflow:** `db:push` (README) vs `migrate deploy` (migrations map) — welke is leidend?
4. **`LandingCategories.vue` refactor:** bewuste UX-redesign of enkel product-link refactor?
5. **Monoliet PR vs 16 kleine PRs:** accepteert team ~16 commits op main of liever 1 feature branch met squash?
6. **Stabilisatie-timing:** lint/build fixes vóór eerste feature commit (G2) of parallel per package na G2–G4?
7. **Dockerfile.product-schema:** aparte commit in stabilisatie-fase (R0.1 A5) vóór eerste deploy van productpagina-feature?

---

## 13. Uitgevoerde commando's (R0.2)

```text
git status --short
git diff --stat HEAD
git diff HEAD --name-only
git ls-files --others --exclude-standard
git diff HEAD --stat -- apps/web/components/landing/LandingCategories.vue ...
# PowerShell counts:
#   Status lines: 107 | Modified: 53 | Untracked entries: 54
#   Untracked files expanded: 73 | Total paths: 126
```

Notion: `notion-search` + `notion-fetch` op VER-10 / R0.2 pagina.

Geen commits, reset, stash, clean, of lint/build fixes uitgevoerd.

---

## 14. Gewijzigde bestanden (R0.2)

| Bestand | Actie |
|---------|-------|
| `docs/working-tree-inventory.md` | **Nieuw** (dit rapport) |

---

*Einde R0.2 — geen commits gemaakt; geen working tree mutaties behalve dit rapport.*
