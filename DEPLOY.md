# Besliswijzer — Deploy guide

De eenvoudigste route voor een solo developer: **Neon** (database) + **Railway** (API + web).

## Overzicht

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Neon      │◄────│  Railway    │     │  Railway     │
│  PostgreSQL │     │  API        │◄────│  Web (Nuxt)  │
└─────────────┘     └─────────────┘     └──────────────┘
                           ▲                    │
                           └────────────────────┘
                              NUXT_PUBLIC_API_BASE
```

---

## Stap 1 — Database (Neon)

1. Ga naar [neon.tech](https://neon.tech) en maak een gratis project aan.
2. Kopieer de **connection string** (met `?sslmode=require`).
3. Lokaal migraties draaien op Neon:

```powershell
cd "C:\Users\Surface 9 pro\Projects\decision-engine"

$env:DATABASE_URL = "postgresql://...neon.../besliswijzer?sslmode=require"
pnpm db:migrate
pnpm db:seed
```

`db:seed` is optioneel — vult demo-categorieën en warmtepomp-flow.

---

## Stap 2 — API deployen (Railway)

1. Ga naar [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**  
   (push je code eerst naar GitHub als dat nog niet zo is)

2. **New Service** → koppel repo `EdSan92/besliswijzer`

3. **Settings → Build:**
   - **Root Directory:** leeg laten (repo-root)
   - **Config file:** `apps/api/railway.toml` (gebruikt `Dockerfile.api`)
   - **Builder:** Dockerfile (niet Nixpacks)

4. Stel **Environment Variables** in:

| Variable | Waarde |
|----------|--------|
| `DATABASE_URL` | Neon connection string |
| `ADMIN_API_KEY` | sterk wachtwoord (32+ tekens) |
| `INSTALL_SECRET` | random string |
| `JWT_SECRET` | random string |
| `WEB_ORIGIN` | `https://jouw-web.up.railway.app` (vul later aan met echt domein) |
| `NODE_ENV` | `production` |

4. Deploy → noteer de publieke URL, bijv. `https://besliswijzerapi-production.up.railway.app`

5. Test: `https://JOUW-API-URL/health` → `{ "status": "ok" }`

> Migraties draaien automatisch bij elke deploy (zie `Dockerfile.api`).

---

## Stap 3 — Web deployen (Railway)

1. In hetzelfde Railway-project: **New Service** → zelfde repo

2. **Settings → Build:**
   - **Root Directory:** leeg laten (repo-root)
   - **Config file:** `apps/web/railway.toml` (gebruikt `Dockerfile.web`)

3. **Build argument** (Railway → Settings → Build):

| Build arg | Waarde |
|-----------|--------|
| `NUXT_PUBLIC_API_BASE` | URL van stap 2 (zonder trailing slash) |

3. **Environment Variables**:

| Variable | Waarde |
|----------|--------|
| `NUXT_PUBLIC_API_BASE` | `https://besliswijzerapi-production.up.railway.app` (jouw echte API-URL, **zonder** trailing slash) |
| `ADMIN_API_KEY` | zelfde als API |
| `NUXT_ADMIN_API_KEY` | optioneel, zelfde waarde (Nuxt runtime override) |
| `NODE_ENV` | `production` |

4. Deploy → noteer web-URL

5. **Update API** `WEB_ORIGIN` met de web-URL → redeploy API

---

## Stap 4 — Admin in productie

1. Ga naar `https://jouw-web.up.railway.app/admin/login`
2. Log in met je `ADMIN_API_KEY`
3. Beheer flows via `/admin`

---

## Stap 5 — Custom domein (optioneel)

### Railway
- Web service → **Settings** → **Networking** → **Custom Domain**
- API service → idem (bijv. `api.jouwdomein.nl`)

### Cloudflare (aanbevolen)
1. DNS CNAME naar Railway
2. SSL: Full (strict)
3. Optioneel: rate limit op `/api/v1/public/*`

Na custom domain:
- Update `NUXT_PUBLIC_API_BASE` → rebuild web
- Update `WEB_ORIGIN` → redeploy API

---

## Lokale data meenemen

```powershell
# Export lokaal
docker exec decision-engine-postgres-1 pg_dump -U decision -d besliswijzer > backup.sql

# Import naar Neon (psql moet geïnstalleerd zijn)
psql "postgresql://...neon.../besliswijzer?sslmode=require" -f backup.sql
```

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| Build faalt met Nixpacks / `pnpm --filter @besliswijzer/api build` | Zet builder op **Dockerfile** via `apps/api/railway.toml`; root directory = repo-root |
| API start niet | Check `DATABASE_URL` en Neon IP allowlist (meestal open) |
| Web kan API niet bereiken | `NUXT_PUBLIC_API_BASE` moet HTTPS API-URL zijn; rebuild web |
| CORS errors | `WEB_ORIGIN` moet exacte web-URL bevatten |
| Admin 401 / kan niet inloggen | `ADMIN_API_KEY` identiek op **web én API**; web opnieuw deployen na wijziging; login via **HTTPS**-URL (cookie `secure`) |
| Admin API 500 / Server Error | Check `NUXT_PUBLIC_API_BASE` op **web** = HTTPS API-URL; `ADMIN_API_KEY` gelijk op web + API; redeploy beide services |
| Lege database | `pnpm db:migrate` + `pnpm db:seed` tegen Neon URL |
| R4 review artefacten ontbreken | Zie **R4 migratie 0006** hieronder |

---

## R4 migratie 0006 (review_record)

Migratie `packages/db/drizzle/0006_review_record_artifact.sql` voegt `review_record` toe aan enum `pipeline_artifact_kind`. Vereist voor pipeline review/approve/reject audit.

### Vooraf (backup)

Neon: maak in het dashboard een **branch snapshot** of export vóór migratie op staging/productie.

Lokaal/staging via `pg_dump` (optioneel):

```powershell
$env:DATABASE_URL = "postgresql://...?sslmode=require"
pg_dump $env:DATABASE_URL --schema-only --no-owner -f backup-schema-$(Get-Date -Format yyyyMMdd).sql
```

### Migratie uitvoeren

```powershell
$env:DATABASE_URL = "postgresql://...staging...?sslmode=require"
pnpm db:migrate
pnpm pipeline:verify-migration-0006
```

Migratie is **herhaalbaar** (`ADD VALUE IF NOT EXISTS`).

### Staging validatie (volledige R4-smoke)

```powershell
$env:DATABASE_URL = "postgresql://...staging...?sslmode=require"
pnpm pipeline:staging-smoke
```

Voert migratie uit (tenzij `--skip-migrate`), verifieert enum, en test review/correctie/approve/idempotente publish/retry/reject tegen `DrizzlePipelineRunStore`. Smoke-runs gebruiken category `__staging_smoke__` — bestaande data blijft intact.

Integratietests lokaal:

```powershell
$env:PIPELINE_STAGING_SMOKE = "true"
pnpm --filter @besliswijzer/db test
pnpm --filter @besliswijzer/pipeline-steps test
```

### Rollback / herstel

PostgreSQL ondersteunt **geen** verwijderen van enum-waarden. Rollback-opties:

1. **Schema-restore** uit Neon branch snapshot of `pg_dump` backup.
2. **Forward-fix**: laat `review_record` staan; oudere API-versies die de waarde niet kennen vermijden.

Bij mislukte migratie halverwege: opnieuw `pnpm db:migrate` — statement is idempotent.

---

## Kosten (indicatie)

| Service | Gratis tier |
|---------|-------------|
| Neon | ~0.5 GB, prima voor MVP |
| Railway | $5 credit/maand, daarna ~$5–15/maand voor 2 services |

---

## Alternatief: alles lokaal testen met Docker

```powershell
docker build -f Dockerfile.api -t besliswijzer-api .
docker build -f Dockerfile.web --build-arg NUXT_PUBLIC_API_BASE=http://localhost:3001 -t besliswijzer-web .
```
