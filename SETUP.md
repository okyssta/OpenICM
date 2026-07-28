# OpenICM Setup Guide

Setup and deployment instructions for OpenICM, the open-source Incentive Compensation Management engine.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (recommended)
- Or: Node.js 22+, PostgreSQL 16+, npm

---

## Quick Start (Docker)

**The fastest way to get OpenICM running with sample data:**

```bash
# 1. Clone the repository
git clone https://github.com/kyssta-exe/OpenICM.git
cd OpenICM

# 2. Start with Docker Compose
#    This builds the app, starts Postgres, pushes the schema,
#    seeds sample data, and launches the server.
docker compose up --build -d

# 3. Open the app
open http://localhost:3000
```

Sample data loads automatically on first start: 3 payees (Alice, Bob, Carol), 5 deals, and a quarterly sales plan (8% base + 4% accelerator above $100k quota).

### First-Time User Flow

1. **Dashboard** — see org stats at a glance
2. **Deals** -> click "Load sample" -> **Import** (or paste your own CSV)
3. **Plans** -> **New plan** -> configure rules -> assign payees -> **Create**
4. Open the plan -> **Calculate commissions** (leave dates blank for current period)
5. **Statements** -> open one to see the per-deal audit trail -> **Approve**
6. **Payouts** -> find the run -> **CSV** to export for payroll

### Stop the server

```bash
docker compose down
# Add --volumes to delete the database data:
docker compose down --volumes
```

---

## Local Development (without Docker)

### 1. Set up PostgreSQL

Start a Postgres 16 instance. With Docker:

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
npm test        # 17 unit tests (engine)
npm run typecheck  # TypeScript check
npm run build      # Production build
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://openicm:openicm@localhost:5432/openicm?schema=public` | PostgreSQL connection string |
| `ORG_ID` | (empty — auto-selects first org) | Explicit org scoping for multi-tenant setups |
| `SEED_ON_START` | (not set) | In Docker, set to `true` to seed sample data on first run |

### Ports

| Service | Port |
|---|---|
| App | `3000` (configurable via `PORT` env) |
| Database | `5432` (Docker internal only) |

---

## Project Structure

```
src/
├── engine/          # Pure calculation engine (zero dependencies)
│   ├── calculator.ts
│   ├── reconstruct.ts
│   └── rules/       # flat-rate, tiered-rate, quota-attainment
├── app/
│   ├── api/         # 12 REST endpoints
│   └── (dashboard)/ # UI pages
├── components/
│   ├── ui/          # UI primitives
│   └── plan-builder.tsx
└── lib/             # DB client, CSV, calc orchestration
```

See [handoff.md](handoff.md) for the complete architecture documentation.

---

## API Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/deals` | GET | Reconstructed deal snapshots |
| `/api/deals/import` | POST | CSV import (text or file upload) |
| `/api/payees` | GET, POST | List / create payees |
| `/api/plans` | GET, POST | List / create plans |
| `/api/plans/[id]` | GET, PUT, DELETE | Plan detail, update, delete |
| `/api/plans/[id]/calculate` | POST | Run commission calculation |
| `/api/runs` | GET | List calculation runs |
| `/api/statements` | GET | List statements |
| `/api/statements/[id]` | GET, PATCH | Statement detail, approve/paid |
| `/api/payouts/export` | GET | Download CSV payout export |

---

## Production Deployment

For production, consider:

- Setting a strong Postgres password in `DATABASE_URL`
- Adding a reverse proxy (nginx/Caddy) with HTTPS
- Setting `ORG_ID` explicitly
- Disabling `SEED_ON_START` after initial setup
- Configuring regular database backups
- Setting up monitoring and alerting
