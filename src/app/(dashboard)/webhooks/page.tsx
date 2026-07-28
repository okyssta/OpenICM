"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";

type Webhook = {
  id: string;
  url: string;
  events: string;
  active: boolean;
  secret: string;
  createdAt: string;
  deliveries: { id: string; event: string; status: string; createdAt: string }[];
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("calculation.completed");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/webhooks")
      .then((r) => r.json())
      .then((d) => setWebhooks(d.webhooks ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function createWebhook() {
    if (!url) return;
    setSaving(true);
    await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    setUrl("");
    setEvents("calculation.completed");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    load();
  }

  async function testWebhook(id: string) {
    // Trigger a calculation on the first plan to test delivery
    const plans = await fetch("/api/plans").then((r) => r.json());
    if (plans.plans?.length) {
      await fetch(`/api/plans/${plans.plans[0].id}/calculate`, { method: "POST" });
      load();
    }
  }

  return (
    <>
      <PageHeader title="Webhooks" description="Send commission events to external services" />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Endpoints</CardTitle>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" /> Add webhook
            </Button>
          </CardHeader>
          <CardContent>
            {showForm && (
              <div className="mb-6 rounded-md border border-border p-4 space-y-3">
                <input
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="https://hooks.example.com/commissions"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <input
                  className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  placeholder="calculation.completed"
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={createWebhook} disabled={saving || !url}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <TableSkeleton rows={3} />
            ) : webhooks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No webhooks configured. Add one to receive commission calculation events.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{wh.url}</span>
                        <Badge variant={wh.active ? "success" : "secondary"}>
                          {wh.active ? "active" : "disabled"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Events: {wh.events} · Created {new Date(wh.createdAt).toLocaleDateString()}
                        {wh.deliveries?.length > 0 && ` · Last: ${wh.deliveries[0].status}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="icon" variant="ghost" onClick={() => testWebhook(wh.id)} title="Test (run calc)">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteWebhook(wh.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery log</CardTitle>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No deliveries yet. Add a webhook and run a calculation.
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.flatMap((wh) =>
                  (wh.deliveries ?? []).slice(0, 10).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-4 py-2 text-sm">
                      <span className="text-muted-foreground">{d.event}</span>
                      <Badge variant={d.status === "delivered" ? "success" : "destructive"}>
                        {d.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
