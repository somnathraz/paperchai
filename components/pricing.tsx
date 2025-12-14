"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type PricingProps = {
  className?: string;
};

export function Pricing({ className }: PricingProps) {
  const [yearly, setYearly] = useState(true);

  const plans = [
    {
      id: "free",
      title: "Free",
      monthly: 0,
      yearly: 0,
      badge: null,
      features: [
        "Up to 3 clients",
        "10 invoices",
        "Manual reminders",
        "Basic dashboard",
      ],
    },
    {
      id: "pro",
      title: "Pro",
      monthly: 149,
      yearly: 1430,
      badge: "Most Popular",
      features: [
        "Unlimited clients",
        "Smart reminders",
        "Reliability score",
        "Monthly recap",
        "Agreement gists",
      ],
    },
  ];

  return (
    <section
      className={cn(
        "space-y-10 rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 shadow-[0_36px_150px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* Heading */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
            Pricing
          </p>
        </div>
        <h3 className="text-3xl font-bold leading-tight">Start free. Upgrade when reminders pay for themselves.</h3>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setYearly(false)}
          className={cn(
            "px-4 py-2 text-sm font-semibold rounded-full border transition",
            !yearly
              ? "bg-primary/15 text-primary border-primary/40 shadow"
              : "bg-secondary border-border hover:border-primary/40"
          )}
        >
          Monthly
        </button>

        <button
          onClick={() => setYearly(true)}
          className={cn(
            "px-4 py-2 text-sm font-semibold rounded-full border transition flex items-center gap-2",
            yearly
              ? "bg-primary/15 text-primary border-primary/40 shadow"
              : "bg-secondary border-border hover:border-primary/40"
          )}
        >
          Yearly
          <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px]">
            Save 20%
          </span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
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
            {/* Badge */}
            {plan.badge && (
              <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                {plan.badge}
              </div>
            )}

            {/* Title */}
            <h4 className="text-xl font-bold text-foreground">{plan.title}</h4>

            {/* Price */}
            <AnimatePresence mode="wait">
              <motion.div
                key={yearly ? "yearly" : "monthly"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="mt-2 text-3xl font-semibold"
              >
                {yearly ? `₹${plan.yearly} / yr` : `₹${plan.monthly} / mo`}
              </motion.div>
            </AnimatePresence>

            {/* Features */}
            <ul className="mt-6 space-y-3 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition",
                plan.id === "pro"
                  ? "bg-primary text-primary-foreground shadow-primary/30"
                  : "bg-secondary text-foreground border border-border hover:border-primary/40"
              )}
            >
              {plan.id === "pro" ? "Choose Pro" : "Start Free"}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Bottom phrase */}
      <p className="text-center text-sm text-muted-foreground">
        No credit card required · Setup in 2 minutes
      </p>
    </section>
  );
}
