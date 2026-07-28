# OpenICM

**Open-source Incentive Compensation Management (ICM) — a self-hostable alternative to CaptivateIQ, Xactly, and Spiff.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/Status-v0.2--stable-green)
[![Build](https://img.shields.io/badge/Build-passing-brightgreen)]()

Companies with variable pay — sales reps, partner programs, affiliates, recruiters — outgrow spreadsheets fast. Manual commission calc is error-prone, unauditable, and breaks the moment a plan has tiers, accelerators, clawbacks, splits, or a retroactively-edited deal. **OpenICM is the first open-source system that solves this end-to-end.**

---

## Quick Start

```bash
git clone https://github.com/kyssta-exe/OpenICM.git
cd OpenICM
docker compose up --build -d
# → http://localhost:3000 (sample data pre-loaded)
```

**First time?** See the [Setup Guide](SETUP.md) for Docker and local development instructions, first-time user flow, API reference, and production deployment tips.

---

## Screenshots

![Dashboard](screenshots/dashboard.png)
![Deals](screenshots/deals.png)
![Plan detail](screenshots/plan-detail.png)
![Statements](screenshots/statements.png)
![Payouts](screenshots/payouts.png)
![Event log](screenshots/events.png)
![Dark mode](screenshots/dashboard-dark.png)
![Login](screenshots/login.png)

---

## Why This Exists

| Problem | Impact |
|---|---|
| No open-source ICM exists | Companies locked into $15k–$100k+/yr per-payee SaaS |
| Spreadsheets break at scale | Tiers, accelerators, clawbacks, splits cause errors |
| Retroactive deal edits corrupt payouts | Without event sourcing, past periods are irrecoverable |
| No audit trail | Reps can't see *why*, finance can't audit *what* |

Unlike CRM, billing, or support — which all have credible open-source incumbents (Chatwoot, Cal.com, Lago) — **commission/ICM had no serious open-source project until now.**

---

## Core Architecture

```
CRM / CSV → Ingestion → Immutable Event Log
                              │
                     Calculation Engine
                 (query over events + active plan)
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    Rep Statements      Dispute Workflow     Payout Export
    (transparency)      (approval + audit)   (to payroll)
```

**Key design principle:** Commissions are computed as a *deterministic query over an immutable event log*, not a mutable running total — the same approach usage-based billing engines use. Retroactive edits recompute cleanly, and every dollar traces to the exact rule + event that produced it.

The calculation engine (`src/engine/`) is a **pure TypeScript module with zero database dependencies** — fully unit-testable, deterministic, and embeddable anywhere.

---

## Features

| Feature | Status |
|---|---|
| **CSV deal import** — paste, upload, or reload sample data. Idempotent dedup. Auto-creates payees. | ✅ |
| **Plan builder** — visual composer: flat rate, tiered (marginal/retroactive), quota attainment, draw/guarantee, clawback. Field filters. | ✅ |
| **Multi-payee splits** — co-owners via `co_owners` column (format: `sarah:30,bob:20`). Automatic deal expansion. | ✅ |
| **Draw / Guarantee** — minimum commission per period. Pro-rata shortfall distribution. | ✅ |
| **Clawback** — auto-reverse commission on churned/cancelled deals within a configurable lookback window. | ✅ |
| **Event-sourced storage** — append-only event log. Corrections are new events, never overwrites. | ✅ |
| **Recompute-on-change** — running a calculation always queries live events + current plan. Deterministic. | ✅ |
| **Rep statements** — full "why did I earn this" breakdown: per-deal, per-rule trace with basis, rate, amount, detail. | ✅ |
| **Dispute workflow** — per-statement comment thread. Approve → mark paid status workflow. | ✅ |
| **CSV payout export** — one-click download per calculation run. | ✅ |
| **GL export** — general-ledger-ready CSV with account codes for accounting integration. | ✅ |
| **Plan simulation** — preview results without persisting. "What-if" mode on the plan page. | ✅ |
| **Plan versioning** — every edit creates a new version; calculations reference the specific version used. | ✅ |
| **Dark mode** — toggle in sidebar. Persists to localStorage. Respects prefers-color-scheme. | ✅ |
| **Event log / audit trail** — raw event viewer at `/events` with expandable JSON payload. | ✅ |
| **Deal search** — filter deals by ID, owner, value, or type. | ✅ |
| **Pagination** — skip/take on all list endpoints. | ✅ |
| **Authentication** — password-based login. API key support (`X-Api-Key` header). Opt-in via `APP_PASSWORD`. | ✅ |
| **RBAC** — payee role field (admin/rep). `X-User-External-Id` header for rep-scoped views. | ✅ |
| **Webhooks** — configurable endpoints with HMAC-SHA256 signatures. Auto-delivered on calculation completion. | ✅ |
| **Rate limiting** — 200 req/min per IP. Configurable in middleware. | ✅ |
| **Public API** — OpenAPI 3.0 spec at `/api/openapi.json`. Full REST coverage. | ✅ |
| **Helm chart** — Kubernetes deployment, service, ingress in `helm/openicm/`. | ✅ |
| **Commission trend** — historical runs view on dashboard for period-over-period comparison. | ✅ |
| **Docker Compose self-hosting** — `docker compose up --build` with auto-migrate + seed. | ✅ |

---

## Roadmap

| Phase | Scope |
|---|---|
| **v0.2 — Current** | Basic auth · API keys · Dark mode · Multi-payee splits · Draw/guarantee · Clawback · Dispute workflow · Plan simulation · Event log · Deal search · Pagination · RBAC · Webhooks · Rate limiting · GL export · Helm chart · OpenAPI spec · Commission trend · All features complete |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database | [PostgreSQL](https://www.postgresql.org/) 16 |
| ORM | [Prisma](https://www.prisma.io/) 6 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Validation | [Zod](https://zod.dev/) |
| Testing | [Vitest](https://vitest.dev/) |
| CSV | [PapaParse](https://www.papaparse.com/) |
| Container | [Docker](https://www.docker.com/) + [Compose](https://docs.docker.com/compose/) |

---

## Repository Structure

```
src/
├── engine/          # Pure calculation engine (zero deps)
│   ├── calculator.ts
│   ├── reconstruct.ts
│   └── rules/       # flat-rate, tiered-rate, quota-attainment
├── app/
│   ├── api/         # Route handlers (12 endpoints)
│   └── (dashboard)/ # UI pages (dashboard, deals, plans, statements, payouts)
├── components/
│   ├── ui/          # UI primitives (button, card, table, etc.)
│   └── plan-builder.tsx  # Visual rule composer
└── lib/             # DB client, CSV, calc orchestration, validation
```

See [handoff.md](handoff.md) for the complete architecture, 10 ADRs, and file-by-file breakdown.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. This is an early-stage project — issues, PRs, and discussions are welcome.

---

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and distribute. If you build a managed cloud service on top, you must contribute your modifications back.
