"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";

type PipelineCounts = {
  draft: number;
  scheduled: number;
  sent: number;
  paid: number;
  overdue: number;
};

const COLUMNS: Array<{ key: keyof PipelineCounts; label: string; href: string }> = [
  { key: "draft", label: "Draft", href: "/invoices?status=draft" },
  { key: "scheduled", label: "Scheduled", href: "/invoices?status=scheduled" },
  { key: "sent", label: "Sent", href: "/invoices?status=sent" },
  { key: "paid", label: "Paid", href: "/invoices?status=paid" },
  { key: "overdue", label: "Overdue", href: "/invoices?status=overdue" },
];

export function InvoicePipelineBoard({
  counts,
  isLoading,
}: {
  counts: PipelineCounts | null;
  isLoading: boolean;
}) {
  return (
    <Card className="border-border/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pipeline</p>
          <h3 className="mt-1 text-lg font-semibold">Invoice lifecycle</h3>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading || !counts
          ? COLUMNS.map((c) => (
              <div key={c.key} className="h-24 animate-pulse rounded-xl bg-muted/50" />
            ))
          : COLUMNS.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className="rounded-xl border border-border/70 bg-background p-3 transition hover:border-primary/40 hover:shadow-sm"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{counts[c.key]}</p>
              </Link>
            ))}
      </div>
    </Card>
  );
}
