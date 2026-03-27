"use client";

import { Card } from "@/components/ui/card";

type Kpis = {
  outstandingAmount: number;
  balanceDueAmount: number;
  collectedMtd: number;
  collectedAllTime: number;
  partialPaymentsAmount: number;
  overdueAmount: number;
  avgDaysToPay: number;
  atRiskCount: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger"
            ? "mt-1 text-lg font-semibold text-destructive"
            : "mt-1 text-lg font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function CashHealthStrip({ kpis, isLoading }: { kpis: Kpis | null; isLoading: boolean }) {
  return (
    <Card className="border-border/70 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Cash Collection Health
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {isLoading || !kpis ? (
          <>
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
          </>
        ) : (
          <>
            <Metric label="Outstanding" value={formatMoney(kpis.outstandingAmount)} />
            <Metric label="Balance Due" value={formatMoney(kpis.balanceDueAmount)} />
            <Metric label="Collected MTD" value={formatMoney(kpis.collectedMtd)} />
            <Metric label="Collected All Time" value={formatMoney(kpis.collectedAllTime)} />
            <Metric label="Partial Payments" value={formatMoney(kpis.partialPaymentsAmount)} />
            <Metric label="Overdue Amount" value={formatMoney(kpis.overdueAmount)} tone="danger" />
            <Metric label="Avg Days To Pay" value={`${kpis.avgDaysToPay.toFixed(1)}d`} />
            <Metric
              label="At-Risk Invoices"
              value={String(kpis.atRiskCount)}
              tone={kpis.atRiskCount > 0 ? "danger" : "default"}
            />
          </>
        )}
      </div>
    </Card>
  );
}
