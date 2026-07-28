// OpenICM Public API specification
// ponytail: hand-written spec covering all public endpoints.
// Auto-generate from route annotations when the API stabilises.

const spec = {
  openapi: "3.0.3",
  info: {
    title: "OpenICM API",
    version: "0.2.0",
    description: "Open-source Incentive Compensation Management engine API",
  },
  servers: [{ url: "/api", description: "OpenICM API" }],
  security: [{ cookieAuth: [], apiKeyAuth: [] }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "openicm_session" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      Deal: {
        type: "object",
        properties: {
          externalId: { type: "string" },
          owner: { type: "string" },
          closedAt: { type: "string", format: "date-time" },
          split: { type: "number" },
          fields: { type: "object" },
          deleted: { type: "boolean" },
        },
      },
      Plan: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          active: { type: "boolean" },
          latestVersion: { type: "integer" },
          assignmentCount: { type: "integer" },
        },
      },
      Statement: {
        type: "object",
        properties: {
          id: { type: "string" },
          totalCommission: { type: "number" },
          dealsCount: { type: "integer" },
          status: { type: "string", enum: ["draft", "approved", "paid"] },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string", format: "uri" },
          events: { type: "string" },
          active: { type: "boolean" },
          secret: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/deals": {
      get: {
        summary: "List reconstructed deals",
        parameters: [
          { name: "skip", in: "query", schema: { type: "integer" } },
          { name: "take", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Deal list" } },
      },
    },
    "/api/deals/import": {
      post: {
        summary: "Import deals from CSV",
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { csv: { type: "string" }, source: { type: "string" } } } } },
        },
        responses: { "200": { description: "Import result" } },
      },
    },
    "/api/plans": {
      get: { summary: "List plans", responses: { "200": { description: "Plan list" } } },
      post: {
        summary: "Create plan",
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Created plan" } },
      },
    },
    "/api/plans/{id}": {
      get: { summary: "Get plan detail", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Plan detail" } } },
      put: { summary: "Update plan", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
      delete: { summary: "Delete plan", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/api/plans/{id}/calculate": {
      post: { summary: "Run commission calculation", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Calculation result" } } },
    },
    "/api/plans/{id}/simulate": {
      post: { summary: "Preview calculation without saving", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Simulation result" } } },
    },
    "/api/statements": {
      get: { summary: "List statements", parameters: [{ name: "runId", in: "query", schema: { type: "string" } }, { name: "payeeId", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Statement list" } } },
    },
    "/api/statements/{id}": {
      get: { summary: "Get statement detail", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Statement detail" } } },
      patch: { summary: "Update statement status", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
    },
    "/api/statements/{id}/disputes": {
      get: { summary: "List dispute comments", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Comments" } } },
      post: { summary: "Add dispute comment", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Created" } } },
    },
    "/api/payees": {
      get: { summary: "List payees", responses: { "200": { description: "Payee list" } } },
      post: { summary: "Upsert payee", responses: { "200": { description: "Payee" } } },
    },
    "/api/payees/me": {
      get: { summary: "Get current user context", responses: { "200": { description: "User context" } } },
    },
    "/api/events": {
      get: { summary: "List raw events (audit log)", parameters: [{ name: "skip", in: "query", schema: { type: "integer" } }, { name: "take", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Event list" } } },
    },
    "/api/runs": {
      get: { summary: "List calculation runs", parameters: [{ name: "skip", in: "query", schema: { type: "integer" } }, { name: "take", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Run list" } } },
    },
    "/api/payouts/export": {
      get: { summary: "Download CSV payout export", parameters: [{ name: "runId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "CSV file" } } },
    },
    "/api/payouts/gl": {
      get: { summary: "Download GL-ready CSV", parameters: [{ name: "runId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "GL CSV file" } } },
    },
    "/api/webhooks": {
      get: { summary: "List webhooks", responses: { "200": { description: "Webhook list" } } },
      post: { summary: "Create webhook", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Webhook" } } } }, responses: { "201": { description: "Created" } } },
    },
    "/api/webhooks/{id}": {
      get: { summary: "Get webhook with recent deliveries", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Webhook" } } },
      put: { summary: "Update webhook", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated" } } },
      delete: { summary: "Delete webhook", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
    },
  },
};

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(spec);
}
