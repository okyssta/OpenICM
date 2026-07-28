"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type Event = {
  id: string;
  type: "deal_created" | "deal_updated" | "deal_deleted";
  dealExternalId: string;
  payload: Record<string, unknown>;
  source: string;
  occurredAt: string;
  ingestedAt: string;
};

const typeVariant = (t: string) =>
  t === "deal_created" ? "success" : t === "deal_updated" ? "warning" : "destructive";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.dealExternalId.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
    );
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Event Log"
        description="Immutable audit trail of every deal change"
      />
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by deal ID, type, or source..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {filtered.length} of {events.length} event(s)
              </span>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "No events match your filter." : "No events yet. Import some deals."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Deal ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Occurred</TableHead>
                    <TableHead>Ingested</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const isOpen = expanded.has(e.id);
                    const payloadStr = JSON.stringify(e.payload, null, 2);
                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => toggle(e.id)}
                      >
                        <TableCell>
                          <Badge variant={typeVariant(e.type) as "success"}>
                            {e.type.replace("deal_", "")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.dealExternalId}</TableCell>
                        <TableCell>{e.source}</TableCell>
                        <TableCell className="text-xs">{formatDate(e.occurredAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(e.ingestedAt)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <code className="text-xs whitespace-pre-wrap">
                            {isOpen ? payloadStr : payloadStr.slice(0, 60) + (payloadStr.length > 60 ? "…" : "")}
                          </code>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
