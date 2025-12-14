"use client";

import { ArrowRight, Sparkles, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RecapCardProps = {
  className?: string;
};

export function RecapCard({ className }: RecapCardProps) {
  const weeklyCashflow = [
    { week: "W1", value: 40 },
    { week: "W2", value: 55 },
    { week: "W3", value: 48 },
    { week: "W4", value: 90 },
  ];

  return (
    <section
      className={cn(
        "rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* HEADER */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
            Month-end recap
          </p>
          <h3 className="text-2xl font-semibold">
            A beautiful, share-ready snapshot of your money.
          </h3>
          <p className="text-muted-foreground">
            Drop it on Slack or Instagram — clients see you in control.
          </p>
        </div>

        {/* SHARE BUTTON */}
        <motion.button
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary to-emerald-500 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/60"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="absolute -right-1 -top-1"
            animate={{ rotate: [0, 180, 360], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
          <Share2 className="h-4 w-4" />
          Share recap
        </motion.button>
      </motion.div>

      {/* MAIN CARD */}
      <motion.div
        className="mt-8 rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:bg-white/10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {/* LEFT TOTAL */}
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Total collected
            </p>
            <motion.p
              className="text-4xl font-bold"
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              ₹4,82,400
            </motion.p>
            <p className="text-sm font-medium text-emerald-500">+22% vs last month</p>

            {/* SMALL METRICS */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Invoiced", value: "₹5,40,000" },
                { label: "Unpaid", value: "₹57,600" },
                { label: "Reliable clients", value: "8" },
                { label: "At risk", value: "2" },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  className="rounded-xl border border-white/20 bg-white/5 p-3 shadow-sm backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + idx * 0.05 }}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-foreground">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT: CASHFLOW CURVE */}
          <div className="p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Weekly cashflow
            </p>

            <div className="relative h-40 w-full">
              {/* Background grid */}
              <div className="absolute inset-0 grid grid-cols-4 opacity-[0.25]">
                <div className="border-r border-muted" />
                <div className="border-r border-muted" />
                <div className="border-r border-muted" />
                <div className="" />
              </div>

              {/* Glow */}
              <motion.div
                className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-400/20 to-transparent blur-2xl"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              />

              {/* CURVE LINE */}
              <svg className="absolute inset-0" viewBox="0 0 400 160" fill="none">
                <motion.path
                  d="
                    M10 120
                    C 80 70, 120 40, 180 60
                    S 300 110, 390 30
                  "
                  stroke="url(#mintGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                />

                <defs>
                  <linearGradient id="mintGradient" x1="0" x2="400" y1="0" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* WEEK LABELS */}
              <div className="absolute bottom-0 flex w-full justify-between text-xs text-muted-foreground font-medium">
                {weeklyCashflow.map((w) => (
                  <div key={w.week} className="flex flex-col items-center">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    />
                    {w.week}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
