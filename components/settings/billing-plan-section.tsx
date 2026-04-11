"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Sparkles, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspacePlanCards } from "@/components/settings/workspace-plan-cards";
import { notifyBillingUpgradeSuccess } from "@/components/settings/billing-upgrade-celebration";
import type { PlanCode } from "@/lib/billing/plans";

type BillingPlanSectionProps = {
  currentPlanCode: PlanCode;
  hasActivePaidPlan: boolean;
  canManageBilling: boolean;
  razorpayConfigured: boolean;
  platformBypass: boolean;
  planName: string;
  billingCurrency: string;
  billingInterval: string;
  currentPrice: number;
  periodEnd?: string | null;
  invoiceUsed: number;
  invoiceLimit: number;
  clientUsed: number;
  clientLimit: number;
  reminderUsed: number;
  reminderLimit: number;
};

export function BillingPlanSection({
  currentPlanCode,
  hasActivePaidPlan,
  canManageBilling,
  razorpayConfigured,
  platformBypass,
  planName,
  billingCurrency,
  billingInterval,
  currentPrice,
  periodEnd,
  invoiceUsed,
  invoiceLimit,
  clientUsed,
  clientLimit,
  reminderUsed,
  reminderLimit,
}: BillingPlanSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isPaid = currentPlanCode !== "FREE";

  const fmt = new Intl.NumberFormat(billingCurrency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: billingCurrency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const handleUpgradeSuccess = (planCode: string) => {
    setDialogOpen(false);
    notifyBillingUpgradeSuccess(planCode);
    router.refresh();
  };

  const renewsText = periodEnd
    ? `Renews ${new Date(periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  return (
    <>
      {/* Current plan card */}
      <div
        className={cn(
          "rounded-2xl border p-6",
          isPaid
            ? "border-primary/25 bg-gradient-to-br from-primary/8 via-emerald-50/40 to-white/80 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.2)]"
            : "border-white/20 bg-white/70 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.3)]"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Active plan
              </p>
              {isPaid && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  ACTIVE
                </span>
              )}
            </div>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{planName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {currentPrice === 0
                ? "Free forever"
                : `${fmt.format(currentPrice / 100)} / ${billingInterval === "year" ? "year" : "month"}`}
              {renewsText ? (
                <span className="ml-2 text-muted-foreground/70">· {renewsText}</span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isPaid ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/8"
                onClick={() => setDialogOpen(true)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                View plans
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary text-white shadow-md shadow-primary/25 hover:opacity-90"
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Upgrade plan
              </Button>
            )}
          </div>
        </div>

        {/* Usage stats */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <UsageStat label="Invoices this month" used={invoiceUsed} limit={invoiceLimit} />
          <UsageStat label="Clients" used={clientUsed} limit={clientLimit} />
          <UsageStat label="Reminders sent" used={reminderUsed} limit={reminderLimit} />
        </div>
      </div>

      {/* Plan upgrade dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto sm:max-h-[88vh] sm:rounded-2xl p-0">
          <div className="sticky top-0 z-10 border-b border-border/60 bg-white/95 backdrop-blur px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {isPaid ? "Explore plans" : "Upgrade your plan"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {isPaid
                  ? "You're on a paid plan. Compare tiers or upgrade to Premier."
                  : "Unlock AI drafting, smart reminders, automations, and recurring invoices."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 pb-8 pt-4">
            <WorkspacePlanCards
              currentPlanCode={currentPlanCode}
              hasActivePaidPlan={hasActivePaidPlan}
              canManageBilling={canManageBilling}
              razorpayConfigured={razorpayConfigured}
              platformBypass={platformBypass}
              onUpgradeSuccess={handleUpgradeSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isUnlimited = limit === -1;

  return (
    <div className="rounded-xl border border-white/50 bg-white/60 p-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-base font-bold">
        {used}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          / {isUnlimited ? "∞" : limit}
        </span>
      </p>
      {!isUnlimited && limit > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
