"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

type Deal = {
  externalId: string;
  owner: string;
  closedAt: string;
  split: number;
  fields: Record<string, unknown>;
};

const SAMPLE = `deal_id,owner,closed_at,value,type
D-1001,alice,2026-01-15,12000,new
D-1002,bob,2026-02-03,8500,renewal
D-1003,alice,2026-02-20,15000,new`;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/deals")
      .then((r) => r.json())
      .then((d) => setDeals(d.deals ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doImport(text: string) {
    if (!text.trim()) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/deals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, source: "csv" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Error: ${data.error ?? "Import failed"}`);
        return;
      }
      const errCount = data.rowErrors?.length ?? 0;
      setResult(
        `Imported ${data.imported} event(s), skipped ${data.duplicatesSkipped} duplicate(s)` +
          (errCount ? `, ${errCount} row error(s)` : "")
      );
      setCsv("");
      load();
    } finally {
      setImporting(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <>
      <PageHeader
        title="Deals"
        description="Immutable event log of ingested transactions"
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Import deals (CSV)</CardTitle>
            <CardDescription>
              Required columns: deal_id, owner, closed_at, value. Optional: split (%),
              plus any custom columns for plan rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={8}
              className="font-mono text-xs"
              placeholder={SAMPLE}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => doImport(csv)} disabled={importing || !csv.trim()}>
                <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import"}
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                Upload file
              </Button>
              <Button variant="ghost" onClick={() => setCsv(SAMPLE)}>
                Load sample
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFile}
              />
            </div>
            {result && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {result}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Current deals ({deals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : deals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No deals yet. Import a CSV to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Split</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d) => (
                    <TableRow key={d.externalId}>
                      <TableCell className="font-mono text-xs">{d.externalId}</TableCell>
                      <TableCell>{d.owner}</TableCell>
                      <TableCell>{formatDate(d.closedAt)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(d.fields.value ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.round(d.split * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
