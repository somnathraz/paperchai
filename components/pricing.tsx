"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BILLING_CURRENCIES, PLAN_DEFINITIONS, PlanCode } from "@/lib/billing/plans";

type PricingProps = {
  className?: string;
};

const PUBLIC_PLAN_ORDER: PlanCode[] = ["FREE", "PREMIUM", "PREMIER"];

export function Pricing({ className }: PricingProps) {
  const [yearly, setYearly] = useState(true);
  const [currency, setCurrency] = useState<(typeof BILLING_CURRENCIES)[number]>("INR");

  const plans = PUBLIC_PLAN_ORDER.map((code) => PLAN_DEFINITIONS[code]);

  const formatPrice = (amount: number) => {
    if (amount === 0) return currency === "INR" ? "₹0" : "$0";
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <section
      className={cn(
        "space-y-10 rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 shadow-[0_36px_150px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Pricing</p>
        </div>
        <h3 className="text-3xl font-bold leading-tight">
          Start free. Upgrade when AI, reminders, and automations save real time.
        </h3>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
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
            onClick={() => setYearly(true)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              yearly
                ? "border-primary/40 bg-primary/15 text-primary shadow"
                : "border-border bg-secondary hover:border-primary/40"
            )}
          >
            Yearly
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
              Better value
            </span>
          </button>
        </div>

        <div className="inline-flex rounded-full border border-border bg-secondary p-1">
          {BILLING_CURRENCIES.map((code) => (
            <button
              key={code}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const amount = yearly ? plan.pricing[currency].yearly : plan.pricing[currency].monthly;
          return (
            <motion.div
              key={plan.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "relative rounded-2xl border border-white/20 bg-white/60 p-8 shadow-xl backdrop-blur-xl dark:bg-white/10",
                plan.badge && "ring-2 ring-primary/40"
              )}
            >
              {plan.badge ? (
                <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                  {plan.badge}
                </div>
              ) : null}

              <h4 className="text-xl font-bold text-foreground">{plan.name}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currency}-${yearly ? "year" : "month"}-${plan.code}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4"
                >
                  <div className="text-3xl font-semibold">
                    {formatPrice(amount)}
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      / {yearly ? "yr" : "mo"}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-6">
                <Link
                  href={
                    plan.code === "FREE"
                      ? "/signup"
                      : `/login?callbackUrl=${encodeURIComponent("/settings/billing#workspace-plans")}`
                  }
                  className={cn(
                    "flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition",
                    plan.code !== "FREE"
                      ? "bg-primary text-primary-foreground shadow-primary/30"
                      : "border border-border bg-secondary text-foreground hover:border-primary/40"
                  )}
                >
                  {plan.code === "FREE" ? "Start Free" : `Choose ${plan.name}`}
                </Link>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        No credit card required for Free. Paid plans and client checkouts use Razorpay; upgrade per
        workspace when you need full AI, reminders, and automations.
      </p>
    </section>
  );
}
