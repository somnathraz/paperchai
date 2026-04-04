"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ActionQueueCard, ActionQueueItem } from "./ActionQueueCard";
import { CashHealthStrip } from "./CashHealthStrip";
import { InvoicePipelineBoard } from "./InvoicePipelineBoard";
import { AutomationReliabilityCard } from "./AutomationReliabilityCard";
import { ReceivablesSection } from "./ReceivablesSection";

type OverviewV2Response = {
  actionQueue: ActionQueueItem[];
  kpis: {
    outstandingAmount: number;
    balanceDueAmount: number;
    collectedMtd: number;
    collectedAllTime: number;
    partialPaymentsAmount: number;
    overdueAmount: number;
    avgDaysToPay: number;
    atRiskCount: number;
  };
  pipelineCounts: {
    draft: number;
    scheduled: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  automationHealth: {
    successRate7d: number;
    failedJobs24h: number;
    dueNext24h: number;
    remindersSent7d: number;
  };
};

export function OverviewV2Section() {
  const [data, setData] = useState<OverviewV2Response | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/overview-v2", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load overview");
      }
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActionQueueCard
            items={data?.actionQueue || []}
            isLoading={isLoading}
            error={error}
            onRetry={load}
          />
        </div>
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Actions</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link
              className="block rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
              href="/invoices/new"
            >
              Create invoice
            </Link>
            <Link
              className="block rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
              href="/clients/new"
            >
              Add client
            </Link>
            <Link
              className="block rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
              href="/clients"
            >
              Add project (from client)
            </Link>
            <Link
              className="block rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
              href="/automation"
            >
              Open automation
            </Link>
          </div>
        </div>
      </div>

      <CashHealthStrip kpis={data?.kpis || null} isLoading={isLoading} />

      <ReceivablesSection compact />

      <InvoicePipelineBoard counts={data?.pipelineCounts || null} isLoading={isLoading} />

      <AutomationReliabilityCard health={data?.automationHealth || null} isLoading={isLoading} />
    </div>
  );
}
