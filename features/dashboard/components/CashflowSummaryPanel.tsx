"use client";

import { BrainCircuit, TrendingUp } from "lucide-react";

type CashflowSummary = {
  headline: string;
  summary: string;
  insights: string[];
  recommendations: string[];
};

export function CashflowSummaryPanel({
  summary,
  isLoading,
}: {
  summary: CashflowSummary | null;
  isLoading?: boolean;
}) {
  return (
    <section className="w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            AI Cashflow Summary
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            {isLoading ? "Reading receivables..." : summary?.headline || "No summary yet"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isLoading
              ? "Building a plain-language receivables snapshot from invoices, payments, clients, and due dates."
              : summary?.summary || "No receivable insights are available yet."}
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
          <BrainCircuit className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            What is happening
          </p>
          <div className="mt-3 space-y-3 text-sm text-foreground">
            {(summary?.insights?.length ? summary.insights : ["No payment trends yet."]).map(
              (item) => (
                <div key={item} className="flex gap-3">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{item}</p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Recommended next action
          </p>
          <div className="mt-3 space-y-3 text-sm text-foreground">
            {(summary?.recommendations?.length
              ? summary.recommendations
              : ["Send invoices early, keep reminders active, and record payments as they arrive."]
            ).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border/60 bg-background/80 px-3 py-2"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
