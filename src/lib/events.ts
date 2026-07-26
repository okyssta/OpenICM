import type { Event } from "@prisma/client";
import type { RawEvent } from "@/engine";

export function toRawEvents(events: Event[]): RawEvent[] {
  const sorted = [...events].sort((a, b) => {
    const t = a.ingestedAt.getTime() - b.ingestedAt.getTime();
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
  return sorted.map((e, seq) => ({
    type: e.type,
    dealExternalId: e.dealExternalId,
    payload: e.payload as Record<string, unknown>,
    occurredAt: e.occurredAt.toISOString(),
    seq,
  }));
}
