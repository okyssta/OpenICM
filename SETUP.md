# OpenICM Setup Guide

Setup and deployment instructions for OpenICM, the open-source Incentive Compensation Management engine.

---

## Quick Start (Docker)

```bash
git clone https://github.com/okyssta/OpenICM.git
cd OpenICM
docker compose up --build -d
# → http://localhost:3000
```

Sample data loads automatically on first start: 3 payees (Alice, Bob, Carol), 5 deals, and a quarterly sales plan.

### First-Time User Flow

1. **Dashboard** — see org stats at a glance
2. **Deals** → "Load sample" → **Import**
3. **Plans** → **New plan** → configure rules → assign payees → **Create**
4. Open the plan → **Calculate commissions**
5. **Statements** → open one to see per-deal audit trail → **Approve**
6. **Payouts** → find the run → **CSV** to export for payroll

---

## Production Deployment

### One-command deploy (Ubuntu VPS)

```bash
bash <(curl -sL https://raw.githubusercontent.com/okyssta/OpenICM/main/deploy.sh) your-domain.com
```

This installs Docker, pulls the image, configures HTTPS via Caddy, and starts the application.

### Manual production deploy

```bash
git clone https://github.com/okyssta/OpenICM.git
cd OpenICM
APP_PASSWORD=your-password docker compose up --build -d
```

For nginx/Caddy with HTTPS:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Local Development (without Docker)

### 1. Set up PostgreSQL

```bash
docker run -d --name openicm-db \
  -e POSTGRES_USER=openicm \
  -e POSTGRES_PASSWORD=openicm \
  -e POSTGRES_DB=openicm \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work with the Docker Postgres above
```

### 3. Install dependencies

```bash
npm install
```

### 4. Push schema and seed data

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

### 6. Verify

```bash
npm test           # 17+ unit tests
npm run typecheck  # TypeScript strict check
npm run build      # Production build
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://openicm:***@localhost:5432/openicm?schema=public` | PostgreSQL connection string |
| `ORG_ID` | (empty — auto-selects first org) | Explicit org scoping for multi-tenant setups |
| `SEED_ON_START` | (not set) | In Docker, set to `true` to seed sample data on first run |
| `APP_PASSWORD` | (empty — no auth) | Set a password to enable single-user authentication |
| `AUTH_SECRET` | (auto) | Secret used to sign session tokens |
| `API_KEY` | (empty) | API key for programmatic access (`X-Api-Key` header) |

### Ports

| Service | Port |
|---|---|
| App | `3000` (configurable via `PORT` env) |
| Database | `5432` (Docker internal only) |

---

## API Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/deals` | GET | Reconstructed deal snapshots |
| `/api/deals/import` | POST | CSV import |
| `/api/payees` | GET, POST | List / create payees |
| `/api/payees/me` | GET | Current user context (RBAC) |
| `/api/plans` | GET, POST | List / create plans |
| `/api/plans/[id]` | GET, PUT, DELETE | Plan CRUD |
| `/api/plans/[id]/calculate` | POST | Run commission calculation |
| `/api/plans/[id]/simulate` | POST | Preview without persisting |
| `/api/runs` | GET | List calculation runs |
| `/api/statements` | GET | List statements |
| `/api/statements/[id]` | GET, PATCH | Statement detail, approve/paid |
| `/api/statements/[id]/disputes` | GET, POST | Dispute comments |
| `/api/payouts/export` | GET | CSV payout export |
| `/api/payouts/gl` | GET | GL-ready CSV export |
| `/api/webhooks` | GET, POST | Webhook CRUD |
| `/api/webhooks/[id]` | GET, PUT, DELETE | Webhook detail/update/delete |
| `/api/events` | GET | Raw event log (audit trail) |
| `/api/openapi` | GET | OpenAPI 3.0 spec |

Full OpenAPI specification at `/api/openapi.json` when the server is running.

---

## Project Structure

```
src/
├── engine/          # Pure calculation engine (zero deps)
│   ├── calculator.ts
│   ├── reconstruct.ts
│   └── rules/       # flat-rate, tiered-rate, quota-attainment, clawback
├── app/
│   ├── api/         # 18+ REST endpoints
│   └── (dashboard)/ # UI pages (dashboard, deals, plans, statements, payouts)
├── components/
│   ├── ui/          # shadcn/ui primitives
│   └── plan-builder.tsx
└── lib/             # DB client, CSV, calc orchestration, validation
helm/                # Kubernetes Helm chart
```

See [handoff.md](handoff.md) for architecture documentation and ADRs.

---

## Production Tips

- Set a strong `AUTH_SECRET` and `APP_PASSWORD`
- Use a reverse proxy (nginx/Caddy) with HTTPS
- Set `ORG_ID` explicitly
- Disable `SEED_ON_START` after initial setup
- Configure regular PostgreSQL backups
