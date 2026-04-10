"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BILLING_CURRENCIES,
  PLAN_DEFINITIONS,
  PlanCode,
  isPlanDowngrade,
  isPlanUpgrade,
} from "@/lib/billing/plans";

const PUBLIC_PLAN_ORDER: PlanCode[] = ["FREE", "PREMIUM", "PREMIER"];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

type WorkspacePlanCardsProps = {
  currentPlanCode: PlanCode;
  canManageBilling: boolean;
  razorpayConfigured: boolean;
  platformBypass: boolean;
};

export function WorkspacePlanCards({
  currentPlanCode,
  canManageBilling,
  razorpayConfigured,
  platformBypass,
}: WorkspacePlanCardsProps) {
  const [yearly, setYearly] = useState(true);
  const [currency, setCurrency] = useState<(typeof BILLING_CURRENCIES)[number]>("INR");
  const [loadingPlan, setLoadingPlan] = useState<PlanCode | null>(null);

  const startCheckout = async (target: PlanCode) => {
    if (target === "FREE" || !canManageBilling || platformBypass || !razorpayConfigured) return;
    if (!isPlanUpgrade(currentPlanCode, target)) return;

    setLoadingPlan(target);
    try {
      const res = await fetch("/api/billing/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: target,
          interval: yearly ? "year" : "month",
          currency,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not start checkout");
      }
      const url = data.paymentLinkUrl as string | undefined;
      if (!url) {
        throw new Error("No payment link returned");
      }
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div id="workspace-plans" className="scroll-mt-24 space-y-4">
      <div className="rounded-2xl border border-white/20 bg-white/60 p-5 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Plans</p>
        <h2 className="mt-2 text-lg font-semibold sm:text-xl">
          Start free. Upgrade when AI, reminders, and automations save real time.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Every tier includes a focused invoicing workspace. Higher plans unlock reliability
          insight, smart WhatsApp and email reminders, AI-assisted drafting, recurring invoices,
          deeper integrations, and Razorpay payment links you generate per invoice.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {razorpayConfigured ? (
            <>
              Choose a billing cycle below, then upgrade on a higher tier. Checkout runs through
              Razorpay; your plan updates when payment completes.
            </>
          ) : (
            <>
              Choose a billing cycle below to compare prices. Tap{" "}
              <span className="font-medium text-foreground">Let&apos;s level you up</span> on a
              higher tier and we&apos;ll help you switch.
            </>
          )}
        </p>
        {platformBypass ? (
          <p className="mt-3 text-sm font-medium text-primary">
            This workspace has platform access; paid checkout is disabled.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                !yearly
                  ? "border-primary/40 bg-primary/15 text-primary shadow"
                  : "border-border bg-secondary hover:border-primary/40"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                yearly
                  ? "border-primary/40 bg-primary/15 text-primary shadow"
                  : "border-border bg-secondary hover:border-primary/40"
              )}
            >
              Yearly
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                Better value
              </span>
            </button>
          </div>
          <div className="inline-flex rounded-full border border-border bg-secondary p-1">
            {BILLING_CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  currency === code ? "bg-white text-foreground shadow" : "text-muted-foreground"
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PUBLIC_PLAN_ORDER.map((planCode) => {
          const candidate = PLAN_DEFINITIONS[planCode];
          const amount = yearly
            ? candidate.pricing[currency].yearly
            : candidate.pricing[currency].monthly;
          const isCurrent = candidate.code === currentPlanCode;
          const upgrade = isPlanUpgrade(currentPlanCode, candidate.code);
          const downgrade = isPlanDowngrade(currentPlanCode, candidate.code);

          let buttonAction: "current" | "upgrade" | "downgrade" | "free_downgrade" = "current";
          if (isCurrent) {
            buttonAction = "current";
          } else if (upgrade) {
            buttonAction = "upgrade";
          } else if (downgrade) {
            buttonAction = candidate.code === "FREE" ? "free_downgrade" : "downgrade";
          }

          const busy = loadingPlan === candidate.code;

          return (
            <div
              key={candidate.code}
              className={cn(
                "flex flex-col rounded-2xl border p-5",
                isCurrent ? "border-primary bg-primary/5" : "border-white/20 bg-white/70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {candidate.description}
                  </p>
                </div>
                {candidate.badge ? (
                  <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {candidate.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-2xl font-bold">
                {amount === 0
                  ? "Free"
                  : `${formatMoney(amount, currency)} / ${yearly ? "yr" : "mo"}`}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5 text-sm text-muted-foreground">
                {candidate.highlights.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {buttonAction === "current" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-primary/30 bg-primary/10 py-2.5 text-sm font-semibold text-primary"
                  >
                    Current plan
                  </button>
                ) : null}
                {buttonAction === "upgrade" ? (
                  !canManageBilling || platformBypass ? (
                    <p className="text-center text-xs text-muted-foreground">
                      Ask an owner or admin to upgrade this workspace.
                    </p>
                  ) : razorpayConfigured ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startCheckout(candidate.code)}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary py-2.5 text-sm font-semibold text-primary-foreground shadow disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Level up now
                    </button>
                  ) : (
                    <Link
                      href="/contact-us"
                      className="flex w-full items-center justify-center rounded-full border border-primary/40 bg-primary/10 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
                    >
                      Let&apos;s level you up
                    </Link>
                  )
                ) : null}
                {buttonAction === "downgrade" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    To switch to a lower paid tier, cancel your subscription first, then upgrade
                    again.
                  </p>
                ) : null}
                {buttonAction === "free_downgrade" ? (
                  <Link
                    href="#subscription-cancellation"
                    className="flex w-full items-center justify-center rounded-full border border-border bg-secondary py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    Cancel subscription
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
