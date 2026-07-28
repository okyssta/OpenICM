// Webhook delivery — POST to registered webhook URLs with HMAC signature.
import { db } from "../db";
import { Prisma } from "@prisma/client";

type WebhookPayload = {
  event: string;
  orgId: string;
  data: Record<string, unknown>;
  timestamp: string;
};

export async function deliverWebhook(orgId: string, event: string, data: Record<string, unknown>) {
  const webhooks = await db.webhook.findMany({ where: { orgId, active: true, events: { contains: event } } });
  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    orgId,
    data,
    timestamp: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);

  for (const wh of webhooks) {
    try {
      const signature = await signPayload(body, wh.secret);
      const res = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenICM-Event": event,
          "X-OpenICM-Signature": `sha256=${signature}`,
          "X-OpenICM-Timestamp": payload.timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      await db.webhookDelivery.create({
        data: {
          webhookId: wh.id,
          event,
          status: res.ok ? "delivered" : "failed",
          responseCode: res.status,
          payload: body as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      await db.webhookDelivery.create({
        data: {
          webhookId: wh.id,
          event,
          status: "failed",
          responseCode: 0,
          payload: { error: String(err) } as Prisma.InputJsonValue,
        },
      });
    }
  }
}

async function signPayload(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
