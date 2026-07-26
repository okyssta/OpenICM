# OpenICM — Handoff Document

**Date:** 2026-07-26
**Version:** v0.1 (MVP)
**Repository:** `D:\Codes\OpenICM`

---

## 1. Project Overview

Open-source Incentive Compensation Management (ICM) engine — a self-hostable alternative to CaptivateIQ, Xactly, and Spiff. Commissions are computed as a *deterministic query over an immutable event log*, enabling clean retroactive recompute whenever deals or plans change. Every dollar traces back to the exact rule and event that produced it.

---

## 2. Architecture Decisions (ADRs)

### ADR-1: Pure Calculation Engine (no DB coupling)
- **Decision:** The calculation engine (`src/engine/`) is zero-dependency TypeScript — no database, no I/O, no framework.
- **Rationale:** Financial logic must be deterministic, auditable, and testable without infrastructure. The engine is a pure function `(events, plan) → results`. This makes it trivial to unit test, impossible to corrupt with DB state, and easy to embed anywhere (CLI, batch jobs, web workers).
- **Tradeoff:** The engine must receive fully reconstructed deal snapshots — reconstruction from raw events is done by a separate adapter (`src/lib/events.ts`).

### ADR-2: Event-Sourced Data Model
- **Decision:** Deals are stored as an append-only event log (`Event` table). Corrections are new events, never overwrites. Deal state is reconstructed by folding events per `dealExternalId`.
- **Rationale:** The entire point of OpenICM is that retroactive deal edits and plan changes recompute cleanly. An event log makes this trivial — you just re-run the calculation over the same event stream. It also gives you a full audit trail of every change ever made.
- **Entities:** `Event` (immutable log), `Payee`, `Plan` / `PlanVersion` (versioned JSON definitions), `PlanAssignment` (many-to-many), `CalculationRun` (snapshot of a compute pass), `CalculationLine` (traceable per-deal per-rule), `Statement` (per-payee per-run), `PayoutExport` (download records).

### ADR-3: Next.js 15 Full-Stack (Not Separate Backend/Frontend)
- **Decision:** Single Next.js 15 app with App Router. API routes live alongside pages.
- **Rationale:** Fastest path to a working, deployable MVP. Avoids CORS, dual auth, and separate deployment. The API routes are RPC-style, not REST-Heavy. The engine is a library import, not a microservice.
- **Tradeoff:** Future high-scale scenarios (background batch processing, separate workers) may need the engine extracted. The engine is already a standalone TS module — extraction would be trivial.

### ADR-4: Plan Definition as JSONB (No Metadata Tables for Rules)
- **Decision:** Plan rules are stored as a single `PlanVersion.definition` JSONB column with a TypeScript-zod schema.
- **Rationale:** Rule structures vary widely between orgs and evolve fast. A normalised "rule parts" schema would be a constant migration tax. JSONB gives us flexibility to add new rule types (MBOs, draws, clawbacks) without schema changes. The zod schema validates at the API boundary.
- **Tradeoff:** Cannot SQL-query inside rule definitions. This is acceptable — rule analysis happens via the engine or the plan-builder UI.

### ADR-5: Single-Tenant by Default (Org ID)
- **Decision:** Every record scoped by `orgId`, but the app auto-selects the first org if `ORG_ID` env var is not set.
- **Rationale:** MVP simplicity. Multi-tenancy is an infrastructure concern, not a logic concern. All queries filter by `orgId`. Adding full multi-tenant isolation later is a matter of auth middleware.

### ADR-6: Tailwind v4 with CSS-First Config (No Tailwind Config JS)
- **Decision:** Uses Tailwind v4's CSS-first `@import "tailwindcss"` and `@theme` block in `globals.css`. No `tailwind.config.ts`.
- **Rationale:** v4 is current, simpler, and avoids the config cascade. The `@theme` block defines a shadcn-compatible color palette as CSS variables.

### ADR-7: Docker Compose Self-Hosting (Not K8s or PaaS)
- **Decision:** Single `docker-compose.yml` with `db` (Postgres 16) + `app` services.
- **Rationale:** Matches the self-hosting model of Lago/Chatwoot — the target deployment for OSS ICM users. The Docker entrypoint handles `prisma db push` + optional seed, then starts the server.

### ADR-8: No Comments in Source Code
- **Decision:** Per project convention, code has zero comments. Intent is expressed through type definitions, function names, and structure.
- **Rationale:** Reduces noise. The engine tests serve as executable documentation for the financial logic.

### ADR-9: Cant-Run Check for "All" Tiers When Total Is Below Lowest Tier Ceiling
- **Decision:** `rateForTotal` and `bandRate` iterate ascending tiers. If total is ≤ the first `upTo`, that tier's rate applies. If total exceeds all bounded tiers, the last tier (which should have `upTo: null`) applies.
- **Edge case:** If total is 0 or quota is 0, no lines are produced. If no tier matches (theoretically impossible given well-formed input), the last tier's rate is used as fallback.

### ADR-10: Floating Point Safety via `round2` at Every Line Boundary
- **Decision:** Every per-line amount is rounded to 2 decimal places via `round2(n)`. For pro-rata distribution, the last line absorbs rounding residuals so totals reconcile exactly.
- **Rationale:** Financial calculations must not accumulate floating-point errors. `round2` uses `Math.round((n + EPSILON) * 100) / 100` which handles common JS floating-point edge cases.

---

## 3. Project Structure

```
OpenICM/
├── .dockerignore
├── .env                    # Local dev (gitignored)
├── .env.example            # Template
├── .gitignore
├── Dockerfile              # Multi-stage alpine build
├── OpenICM.md              # Product spec
├── docker-compose.yml      # app + postgres
├── next.config.ts          # Next.js config
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── scripts/
│   └── docker-entrypoint.sh  # Runs db push + optional seed + starts server
├── prisma/
│   ├── schema.prisma         # Event-sourced data model
│   └── seed.ts               # Sample data: org, payees, plan, deals
├── public/                   # (empty — can serve static assets later)
└── src/
    ├── app/                  # Next.js App Router
    │   ├── globals.css       # Tailwind v4 theme + base
    │   ├── icon.svg          # Favicon
    │   ├── layout.tsx        # Root layout
    │   ├── page.tsx          # Redirect to /dashboard
    │   ├── (dashboard)/      # Authenticated layout (layout + pages below)
    │   │   ├── layout.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── deals/page.tsx
    │   │   ├── plans/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── statements/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   └── payouts/page.tsx
    │   └── api/              # Route handlers
    │       ├── deals/route.ts
    │       ├── deals/import/route.ts
    │       ├── payees/route.ts
    │       ├── plans/route.ts
    │       ├── plans/[id]/route.ts
    │       ├── plans/[id]/calculate/route.ts
    │       ├── runs/route.ts
    │       ├── statements/route.ts
    │       ├── statements/[id]/route.ts
    │       └── payouts/export/route.ts
    ├── components/
    │   ├── app-shell.tsx         # Sidebar nav layout
    │   ├── page-header.tsx       # Reusable page header
    │   ├── plan-builder.tsx      # Visual plan composer (complex component)
    │   └── ui/                   # Primitive components (shadcn-style)
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── select.tsx
    │       ├── table.tsx
    │       └── textarea.tsx
    ├── engine/                   # Pure calculation engine (zero deps)
    │   ├── index.ts
    │   ├── types.ts
    │   ├── helpers.ts
    │   ├── reconstruct.ts        # Fold events → deal snapshots
    │   ├── calculator.ts         # Orchestrate: filter → group → apply rules
    │   ├── rules/
    │   │   ├── index.ts          # Dispatcher
    │   │   ├── flat-rate.ts
    │   │   ├── tiered-rate.ts
    │   │   └── quota-attainment.ts
    │   └── __tests__/
    │       ├── reconstruct.test.ts (6 tests)
    │       └── calculator.test.ts (11 tests)
    └── lib/                      # Application services
        ├── db.ts                 # Prisma singleton
        ├── utils.ts              # cn(), formatCurrency, etc.
        ├── csv.ts                # parseCsv, buildDealEvents, statementsToCsv
        ├── org.ts                # Org resolution
        ├── events.ts             # DB event → RawEvent adapter
        ├── calc.ts               # runCalculation (orchestrates engine + persistence)
        └── plan-schema.ts        # Zod validation for plan definitions
```

---

## 4. Goals Verification (MVP v0.1)

| Goal from OpenICM.md | Status | Evidence |
|---|---|---|
| **CSV/manual deal import** | ✅ Done | `src/app/(dashboard)/deals/page.tsx` — paste CSV text, upload file, sample data. POST to `/api/deals/import`. Idempotent via `idempotencyKey` unique constraint. Auto-creates payees from `owner` column. |
| **Plan builder: flat rate + tiered rate + quota attainment** | ✅ Done | `src/components/plan-builder.tsx` — visual component editor with dynamic tier/band editors, filter support, period/currency selection. Exhaustive switch via `never` type ensures all rule types handled. |
| **Event-log storage with recompute-on-change** | ✅ Done | `src/engine/reconstruct.ts` folds events into current snapshots. `src/engine/calculator.ts` recomputes from scratch each run. `runCalculation()` in `src/lib/calc.ts` orchestrates reconstruction + engine + DB persistence in a transaction. |
| **Rep statement view (read-only)** | ✅ Done | `src/app/(dashboard)/statements/[id]/page.tsx` — full break-down grouped by component: deal → basis → rate → amount → detail trace. Summary cards (total, deals, lines). Status badge + approve/mark-paid workflow. |
| **CSV payout export** | ✅ Done | `src/app/(dashboard)/payouts/page.tsx` lists calculation runs. Each run has a "CSV" button → GET `/api/payouts/export?runId=...` returns downloadable CSV with payee, period, deals, commission, currency, status. Each download is recorded as a `PayoutExport`. |

### Additional MVP Completeness

| Criterion | Status | Notes |
|---|---|---|
| **Immutability** | ✅ | Events are `Event` rows with `type` (created/updated/deleted), never mutated after insert. Reconstruction folds the log. |
| **Deterministic calc** | ✅ | Pure function: given same events + plan version, returns identical results (confirmed by tests). |
| **Audit trail** | ✅ | `CalculationLine` stores per-deal per-rule breakdown with `detail` JSON (type, rate, mode, cumulative totals, attainment ratio). |
| **Cent reconciliation** | ✅ | `round2` applied at every line. Last-line residual absorption in pro-rata distribution. Test confirms sum of lines ≈ total. |
| **Re-run on period** | ✅ | `calculate` accepts `periodStart`/`periodEnd`. Running again with same parameters produces same result (deterministic). |
| **Plan versioning** | ✅ | `PlanVersion` stores immutable definitions. PUT `/api/plans/[id]` with new definition creates a new version (max+1). Calculation runs reference the specific version. |
| **Approval workflow** | ✅ | `Statement` status: `draft → approved → paid`. PATCH `/api/statements/[id]` transitions status. UI shows badge + approve/mark-paid buttons. |
| **Deployment** | ✅ | `docker-compose.yml` + `Dockerfile` + `docker-entrypoint.sh`. Run `docker compose up --build`. Sample data seeded with `SEED_ON_START=true`. |

---

## 5. Verification Status

| Check | Result |
|---|---|
| `npm test` (17 engine tests) | ✅ All pass (6 reconstruct + 11 calculator) |
| `tsc --noEmit` | ✅ Clean — zero type errors |
| `npm run build` | ✅ All 18 routes compile: 8 pages + 1 icon + 9 API routes |
| `npm run lint` | ⚡ Not configured (no eslint config); `next lint` disabled via `ignoreDuringBuilds` |
| Postgres end-to-end | ⚡ Requires running Postgres with `docker compose up` |

### Covered by Tests

The engine tests cover:
- **Reconstruct:** single create, update-on-create, time-order independence, seq tie-breaking, deleted marking, re-create after delete, split percentage parsing
- **Flat rate:** basic percentage, split scaling, field filter exclusion
- **Tiered marginal:** single-deal progressive, multi-deal accumulation in time order
- **Tiered retroactive:** single rate applied to total, correct tier selection
- **Quota attainment:** accelerator band above quota, base band below quota, edge case at exactly quota boundary
- **Orchestration:** deleted/excluded deals filtered out, out-of-period exclusion, multi-payee grouping, multi-component summing, cent-level line-to-total reconciliation

### Untested (Manual or Integration)

- Plan builder UI interactions (no E2E framework configured)
- CSV import → DB persistence → re-read roundtrip (needs Postgres)
- Docker build and container startup
- Browser rendering of all pages
- Multi-session concurrent calc runs (transaction isolation)

---

## 6. Known Gaps & TODOs

### Must-Fix Before v0.2
- **CSV import error reporting** — the UI shows `rowErrors` count but not the individual row errors inline. The API returns them but the UI doesn't display the list.
- **Plan builder filter UI** — the `value` field coerce logic (number vs string detection) is naive. Needs clearer UX hinting for the user.
- **Seed script `orgId`** — uses a hardcoded `seed-org` ID. Fine for single-setup, but clashes if user has their own org. The seed should either (a) skip if any org exists, or (b) use a random ID and print it.
- **No authentication/authorization** — completely open. Every request resolves the first org. Fine for local self-host but not production. v0.2 must add at minimum basic auth or SSO.
- **No input validation on `statements/[id]/PATCH` status** — the route checks validity but doesn't enforce workflow order (draft→approved→paid should not allow draft→paid directly). Should add state machine validation.
- **`rate` field in retroactive tiered mode** — the per-line `rate` is computed as `amount / basis`, which for retroactive is the band rate, correct but imprecise if basis=0 (filtered earlier so fine).

### Known Non-Critical Issues
- **`npm run lint`** fails because `eslint` + `eslint-config-next` not in dependencies. Add and configure.
- **`package.json#prisma`** deprecation — Prisma 7 will require a `prisma.config.ts` file. Migration is straightforward but not urgent.
- **No pagination** on `/api/deals`, `/api/statements`, `/api/runs`. Fine for MVP scale but will break with 10k+ records.
- **`reconstructDeals` loads all org events** — for a large org this is memory-heavy. Should add period-filtering at the DB query level.
- **No OpenAPI / API docs** — the API is discoverable via the code but has no documented spec.
- **`ORG_ID` env var** — if set to a non-existent ID, the app will try to query a non-existent org and return empty results silently. Should validate on startup.

---

## 7. Roadmap (Beyond MVP)

| Phase | Key Features | Est. Effort |
|---|---|---|
| **v0.2** | CRM connectors (Salesforce/HubSpot webhook + OAuth) · Basic auth (password or magic link) · Dispute workflow · RBAC (admin vs rep views) · E2E browser tests (Playwright) | 2-3 weeks |
| **v0.3** | Multi-payee splits (deal split across N reps) · Clawbacks (churn within X months) · Draws/guarantees · Plan simulation / what-if mode · GL/accounting export | 2-3 weeks |
| **v0.4** | Payroll connectors (Gusto, Deel) · SSO (SAML/OIDC) · SOX-grade audit hardening · Public REST API + webhooks · Rate limiting + API keys | 3-4 weeks |
| **v1.0** | Managed cloud offering (open-core) · Plugin system for custom rule types · Mobile UI · Advanced forecasting · Helm chart for k8s | 4-6 weeks |

---

## 8. Running the Project

### Docker (recommended, includes Postgres + sample data)
```bash
docker compose up --build
# → http://localhost:3000
```

### Local Dev (needs Postgres running at `DATABASE_URL`)
```bash
# 1. Set DATABASE_URL in .env
# 2. Push schema + seed
npx prisma db push
npx tsx prisma/seed.ts
# 3. Start dev server
npm run dev
# → http://localhost:3000
```

### First-Time User Flow
1. Open the app → redirected to `/dashboard`
2. Go to **Deals** → click "Load sample" → **Import** (or paste your own CSV)
3. Go to **Plans** → "New plan" → configure rules → assign payees → **Create plan**
4. Open the plan → set period dates (or leave blank for current period) → **Calculate commissions**
5. Go to **Statements** → click a statement to see the per-deal breakdown → **Approve**
6. Go to **Payouts** → find the run → click **CSV** to download payroll export

---

## 9. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.5.22 |
| Language | TypeScript | 5.8.3 |
| Styling | Tailwind CSS | 4.1.4 |
| Database | PostgreSQL | 16 (via Docker) |
| ORM | Prisma | 6.19.3 |
| Validation | Zod | 3.24.3 |
| Testing | Vitest | 3.2.7 |
| CSV | PapaParse | 5.5.2 |
| Icons | Lucide React | 0.503 |
| Runtime | Node.js | 24 |
| Container | Docker + Docker Compose | — |
| License | AGPL-3.0 (recommended) | — |

---

## 10. Key Configuration

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://openicm:openicm@localhost:5432/openicm` | Postgres connection string |
| `ORG_ID` | (empty — auto-selects first org) | Explicit org scoping |
| `SEED_ON_START` | (not set) | In Docker, set to `true` to seed sample data on first run |

### Exposed Ports
- App: `3000` (configurable via `PORT` env)
- Database (Docker only): `5432` (internal to compose network)

---

## 11. File-by-File Summary (Key Files Only)

### Engine (Pure Logic — No Framework Dependencies)
- `src/engine/types.ts` — All type definitions for plan components, deals, calc inputs/results, filters.
- `src/engine/helpers.ts` — `round2` (safe money rounding), `numericBasis` (field→number), `matchesFilters`, `inPeriod`, `groupByPayee` (with auto-sort by closedAt).
- `src/engine/reconstruct.ts` — `RawEvent` type (DB-agnostic event). `reconstructDeals(events)` folds events grouped by `dealExternalId`, sorted by `occurredAt` then `seq`. Handles created/updated/deleted + re-create.
- `src/engine/calculator.ts` — `calculate(input)` filters non-deleted/in-period deals, groups by payee, applies all plan components, totals per payee, counts unique deals per payee.
- `src/engine/rules/flat-rate.ts` — Per-deal: basis × rate × split, filtered.
- `src/engine/rules/tiered-rate.ts` — `marginal`: progressive per-deal slice across tiers; `retroactive`: single rate on total, pro-rata distribution with last-line residual.
- `src/engine/rules/quota-attainment.ts` — Total basis / quota → attainment ratio → band rate → total commission → pro-rata per deal.

### Lib (Application Services — Depends on Prisma + Next)
- `src/lib/csv.ts` — `parseCsv` (PapaParse), `buildDealEvents` (classifies created vs updated by existing IDs, coerces values), `statementsToCsv` (exports to downloadable format).
- `src/lib/calc.ts` — `runCalculation(orgId, planId, periodStart, periodEnd)` loads plan + latest version + assignments + events, reconstructs deals, scopes to assigned payees, runs engine, persists run + lines + statements in a Prisma transaction. Also `periodBounds(period, ref)` computes period date ranges.
- `src/lib/plan-schema.ts` — Zod discriminated union validating plan definitions. Ensures every component has correct shape before writing to DB.
- `src/lib/events.ts` — Maps Prisma `Event` rows to engine `RawEvent` with stable ingestion-order sequencing.

### Prisma Schema
- `prisma/schema.prisma` — 9 models: `Organization`, `Payee`, `Plan`, `PlanVersion`, `PlanAssignment`, `Event`, `CalculationRun`, `CalculationLine`, `Statement`, `PayoutExport`. Key constraints: unique `(orgId, externalId)` on Payee, unique `(orgId, idempotencyKey)` on Event for dedup, unique `(runId, payeeId)` on Statement, indexes on most queried fields.
- `prisma/seed.ts` — Creates "Acme Inc" org, 3 payees (alice, bob, carol), a quarterly plan with 8% base + 4% accelerator above $100k quota, and 5 sample deals in the current quarter. Idempotent upserts.

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/deals` | GET | Returns reconstructed, non-deleted deals sorted by closedAt desc |
| `/api/deals/import` | POST | CSV text → parse → create/update events → auto-upsert payees → response with counts |
| `/api/payees` | GET, POST | List / upsert payees |
| `/api/plans` | GET, POST | List plans (with latest version + assignment count) / Create plan + version 1 + assignments |
| `/api/plans/[id]` | GET, PUT, DELETE | Detail (including all versions + assignments) / Update (name, new version, reassign) / Delete |
| `/api/plans/[id]/calculate` | POST | Run calculation for period (auto-detects from plan period if not specified) |
| `/api/runs` | GET | List calculation runs with plan and counts |
| `/api/statements` | GET | List statements (filterable by runId, payeeId) |
| `/api/statements/[id]` | GET, PATCH | Detail with lines / Update status (draft → approved → paid) |
| `/api/payouts/export` | GET | Download CSV for a run + record PayoutExport |

### UI Pages
| Route | Description |
|---|---|
| `/dashboard` | Stats cards (deals, payees, plans, latest total) + recent statements list |
| `/deals` | Deal table + CSV import panel (load sample, paste, or upload file) |
| `/plans` | Plan list with version badges, component counts, assignment counts |
| `/plans/new` | Plan builder form: name, period, currency, PlanBuilder component, payee checkboxes |
| `/plans/[id]` | Plan detail: PlanBuilder (editable), save new version, assign payees, run calculation with date inputs, results, version history |
| `/statements` | Statement list with payee/plan/period/commission/status |
| `/statements/[id]` | Statement detail: summary cards, lines grouped by component, approve/mark-paid buttons |
| `/payouts` | Calculation runs table with export CSV buttons |

---

## 12. Future Considerations

### Performance at Scale
- The engine reconstructs deals from ALL events each time. For 10k+ deals with frequent edits, add period-filtering at the DB query: `WHERE occurredAt BETWEEN :start AND :end` on the Event query in `runCalculation`.
- The engine is synchronous. For 100k+ deals, run in a background worker (Vercel cron, BullMQ, or just a Node child process). The engine is a pure function so it's trivial to serialize input → send to worker → store result.
- Add pagination to list endpoints before they reach production scale.

### Multi-Tenant Hardening
- The `orgId` pattern is correct but the app has no middleware layer. Add a middleware that reads the org from the request (subdomain, header, or JWT claim) and injects it via `AsyncLocalStorage` so routes don't have to call `getOrgId()`.

### Plan Validation
- The zod schema validates structure but not semantic validity (e.g., overlapping tiers, tier gaps, negative rates). Add a `validateDefinition(def)` function in the engine that checks these.

### Licensing
- The package.json lists `"license": "AGPL-3.0"`. This is appropriate for an open-source project competing with SaaS vendors. If the plan includes an open-core managed cloud, AGPL ensures any modifications to the OSS core must be contributed back while allowing the managed cloud to charge for proprietary enterprise features.

---

## 13. Appendices

### A. TypeScript Compilation Notes
- Path alias `@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.ts).
- Prisma types generated to `node_modules/@prisma/client`.
- The `json` field type in Prisma requires explicit casts (`as Prisma.InputJsonValue`) when assigning typed objects. Casts are applied at 4 write sites (affirmed during typecheck fix).

### B. Financial Calculation Correctness
- All monetary values are in the smallest currency unit's natural decimal (USD cents via round2).
- Pro-rata distribution uses "sum of parts, last absorbs residual" pattern to guarantee totalCommission == sum(line.amount) for each payee.
- Marginal tiering processes deals in `closedAt` order (sorted by `groupByPayee`).
- Quota attainment bands are attainment-ratio tiers (1.0 = 100% of quota). Example: `[{upTo: 1.0, rate: 0.08}, {upTo: null, rate: 0.12}]` means 8% up to 100% attainment, 12% on all deals once quota is exceeded.

### C. Tailwind v4 Notes
- Colors defined in `@theme` use OKLCH for perceptual uniformity.
- No `tailwind.config.ts` — the CSS-first approach uses `@import "tailwindcss"` in `globals.css`.
- PostCSS plugin: `@tailwindcss/postcss` (v4 compatible).
