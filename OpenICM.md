# OpenICM

**An open-source Incentive Compensation Management (ICM) engine — a real alternative to CaptivateIQ, Xactly, and Spiff.**

---

## 1. The Problem

Every company with variable pay — sales reps, partner/channel programs, affiliates, recruiters — eventually outgrows spreadsheets for commission calculation. Manual calc is error-prone, impossible to audit, and breaks the moment a plan has tiers, accelerators, clawbacks, splits, or a retroactively-edited deal.

This is a universal, recurring, high-stakes finance problem — it determines what shows up in people's paychecks — yet unlike CRM, billing, or support (which all have credible open-source incumbents: Chatwoot, Cal.com, Lago), **commission/ICM has no serious open-source project.**

## 2. The SaaS It Replaces

| Product | Category | Typical Cost |
|---|---|---|
| CaptivateIQ | Sales compensation / ICM | $15k–$100k+/yr, scales per payee |
| Xactly Incent | Enterprise ICM | Custom, enterprise-tier pricing |
| Spiff (Salesforce) | Sales compensation | Custom pricing |
| Varicent, Everstage, Performio, QuotaPath | ICM / commission tracking | $10k+/yr typical |

All are closed-source, lock core compensation logic behind a vendor, and charge per-payee — punishing companies right as they scale headcount.

## 3. Why People Need This

- Compensation logic is business-critical financial infrastructure — companies shouldn't have to trust a black box (or a spreadsheet) with it.
- Growing teams hit plan complexity (tiers, accelerators, SPIFs, clawbacks, multi-rep splits) that spreadsheets can't handle reliably.
- Deals get edited retroactively (discounts, cancellations, re-attribution) — most naive tools don't recompute cleanly or leave an audit trail.
- Reps want transparency into *why* they earned what they earned; finance wants an auditable system of record.

## 4. Competitive Research (What Already Exists)

Checked: GitHub, GitLab, PyPI, Capterra "free" category, Product Hunt, Hacker News.

**Proprietary (no OSS equivalent to any of these):**
CaptivateIQ, Xactly Incent, Spiff, Varicent, Everstage, Performio, QuotaPath, Sales Cookie, Core Commissions, QCommission.

**Closest "open-source" results found (none solve the core workflow):**
- `sale_commission` / `sale_commission_formula` — an Odoo ERP add-on module. Only works bolted onto Odoo; no standalone plan engine, no CRM-agnostic ingestion, no audit/recompute model.
- `commission-tracker` (GitHub) and similar — small student/hobby CRUD apps. No rules engine, no retroactive recompute, no audit trail, effectively toy projects.
- `captableinc/captable` — open-source, but solves **equity/cap table management**, not commission calculation. Adjacent space, different problem.

**Conclusion:** No open-source project performs the core ICM workflow (ingest deals → apply a plan's rules → calculate payouts → handle retroactive changes → produce auditable statements) as a standalone, CRM-agnostic system.

## 5. How OpenICM Works

### Architecture Overview

```
CRM / Data Sources → Ingestion Layer → Event Log (immutable)
                                             │
                                    Calculation Engine
                                    (queries event log,
                                     applies active plan)
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
                Rep Statements        Dispute Workflow      Payout Export
                (transparency)        (approval/audit)      (to payroll)
```

### Core Components

1. **Ingestion Layer**
   - Connectors for CRMs (Salesforce, HubSpot, Pipedrive) plus CSV/API import.
   - Deals/transactions stored as an **immutable event log** — corrections are new events, not overwrites, so history is never silently mutated.

2. **Plan Builder**
   - Rules engine (YAML/DSL, or a no-code UI on top of it) instead of hardcoded logic.
   - Supports quotas, tiered rates, accelerators, SPIFs, clawbacks, draws, and multi-payee splits.

3. **Calculation Engine**
   - Computes commissions as a **query over the event log at run time** (same principle usage-billing engines like Orb use for metering) — so retroactive deal edits or plan changes recompute cleanly instead of corrupting past payouts.
   - Every calculation is traceable back to the specific rule and event that produced it.

4. **Statements & Disputes**
   - Per-rep dashboard showing exactly why they earned what.
   - Built-in dispute/approval workflow that finance can audit.

5. **Payout Export**
   - Pushes approved amounts to payroll systems (Deel, Gusto, etc.) rather than processing payments directly — keeps scope tight and avoids becoming a payments company.

## 6. Why This Is Defensible as an OSS Project (Not Just Another Wrapper)

- Not a clone: no existing OSS project performs this workflow end-to-end.
- Not a combination of existing tools: the "recompute over immutable event log" model is a genuine architectural choice, not glue code.
- Not an AI wrapper: this is a rules/calculation engine + audit system — deterministic, not model-dependent.
- Solves a frequent, expensive, real problem for a wide market (any company with variable comp).

## 7. Suggested Tech Stack (Starting Point)

- **Backend:** Node.js/TypeScript or Python, Postgres (event-sourced schema)
- **Rules engine:** custom DSL or embed something like `json-rules-engine` / a small interpreted language for plan logic
- **Frontend:** Next.js + a plan-builder UI (visual rule composer)
- **Integrations:** Salesforce/HubSpot/Pipedrive APIs, CSV import, Zapier/webhook fallback
- **Deployment:** Docker Compose for self-hosting, similar to Lago/Chatwoot's model

## 8. MVP Scope (v0.1)

- [ ] CSV/manual deal import
- [ ] Simple plan builder: flat rate + tiered rate + quota attainment
- [ ] Event-log storage with recompute-on-change
- [ ] Rep statement view (read-only)
- [ ] CSV payout export

## 9. Closest Competitors Checked (Reference List)

CaptivateIQ · Xactly Incent · Spiff (Salesforce) · Varicent · Everstage · Performio · QuotaPath · Sales Cookie · Core Commissions · QCommission · Odoo `sale_commission` module · `captableinc/captable` (adjacent, not competing)
