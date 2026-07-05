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

4. Deploy → noteer de publieke URL, bijv. `https://besliswijzer-api-production.up.railway.app`

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
| `NUXT_PUBLIC_API_BASE` | `https://jouw-api.up.railway.app` |
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
