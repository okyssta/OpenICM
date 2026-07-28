"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

type Statement = {
  id: string;
  totalCommission: number;
  dealsCount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  payee: { name: string; externalId: string; email: string | null };
  run: { plan: { name: string }; planVersion: { version: number; definition: { currency: string } } };
};

type Line = {
  id: string;
  dealExternalId: string;
  componentName: string;
  basis: number;
  rate: number;
  amount: number;
  detail: Record<string, unknown>;
};

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    fetch(`/api/statements/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setStatement(d.statement);
        setLines(d.lines ?? []);
        setStatus(d.statement.status);
      });
    fetch(`/api/statements/${id}/disputes`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatusTo(next: string) {
    await fetch(`/api/statements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatus(next);
  }

  async function addComment() {
    if (!body.trim()) return;
    setSending(true);
    await fetch(`/api/statements/${id}/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: author.trim() || "Finance",
        body: body.trim(),
      }),
    });
    setBody("");
    setSending(false);
    fetch(`/api/statements/${id}/disputes`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []));
  }

  if (!statement) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  const currency = statement.run.planVersion.definition.currency;
  const byComponent = lines.reduce<Record<string, Line[]>>((acc, l) => {
    (acc[l.componentName] ??= []).push(l);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title={`${statement.payee.name} — Statement`}
        description={`${statement.run.plan.name} · v${statement.run.planVersion.version} · ${formatDate(
          statement.periodStart
        )} – ${formatDate(statement.periodEnd)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={status === "approved" ? "success" : status === "paid" ? "default" : "secondary"}>
              {status}
            </Badge>
            {status === "draft" && (
              <Button size="sm" onClick={() => setStatusTo("approved")}>
                <Check className="h-4 w-4" /> Approve
              </Button>
            )}
            {status === "approved" && (
              <Button size="sm" onClick={() => setStatusTo("paid")}>
                Mark paid
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6 p-8">
        <Link href="/statements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> All statements
        </Link>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total commission</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {formatCurrency(statement.totalCommission, currency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deals credited</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{statement.dealsCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Calculation lines</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{lines.length}</CardContent>
          </Card>
        </div>

        {Object.entries(byComponent).map(([component, compLines]) => (
          <Card key={component}>
            <CardHeader>
              <CardTitle className="text-base">{component}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Basis</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compLines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.dealExternalId}</TableCell>
                      <TableCell className="text-right">{formatCurrency(l.basis, currency)}</TableCell>
                      <TableCell className="text-right">{formatPercent(l.rate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(l.amount, currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {Object.entries(l.detail)
                          .filter(([k]) => k !== "type")
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {/* Dispute / Comments section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Dispute comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{c.author}</span>
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Your name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="Type your comment..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                />
                <Button size="sm" onClick={addComment} disabled={sending || !body.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
