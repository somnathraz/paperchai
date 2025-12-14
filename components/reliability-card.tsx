"use client";

import { BadgeCheck, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ReliabilityCardProps = {
  className?: string;
};

export function ReliabilityCard({ className }: ReliabilityCardProps) {
  const score = 62;
  const circumference = 2 * Math.PI * 45;

  const red = (40 / 100) * circumference;
  const yellow = (30 / 100) * circumference;
  const green = (30 / 100) * circumference;

  let currentSegment = 0;
  let currentColor = "red";

  if (score <= 40) {
    currentSegment = (score / 40) * red;
    currentColor = "red";
  } else if (score <= 70) {
    currentSegment = red + ((score - 40) / 30) * yellow;
    currentColor = "yellow";
  } else {
    currentSegment = red + yellow + ((score - 70) / 30) * green;
    currentColor = "green";
  }

  const trendData = [58, 60, 59, 61, 62, 61, 62];

  return (
    <section
      className={cn(
        "rounded-3xl border border-white/15 bg-gradient-to-br from-white/95 via-card/95 to-muted/70 p-10 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* HEADER */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
            Client reliability
          </p>
          <h3 className="text-2xl font-semibold">
            Know who to trust before you start.
          </h3>
          <p className="text-muted-foreground">
            PaperChai grades each client across speed, consistency, and reminder response.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary shadow-lg shadow-primary/20">
          Live scoring
          <BadgeCheck className="h-4 w-4" />
        </span>
      </motion.div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* MAIN CARD */}
        <motion.div
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/50 via-white/40 to-muted/40 dark:from-white/10 dark:via-white/5 dark:to-white/10 p-8 shadow-xl backdrop-blur-xl"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          {/* CLIENT HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold shadow-md">
                NL
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Client
                </p>
                <p className="text-lg font-semibold">Nova Labs</p>
              </div>
            </div>

            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 shadow-sm">
              Sometimes late
            </span>
          </div>

          {/* GAUGE */}
          <div className="relative mx-auto my-8 flex h-40 w-40 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Red */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#ef4444"
                strokeWidth="8"
                strokeDasharray={red}
                strokeDashoffset={circumference - red}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - red }}
                transition={{ duration: 1 }}
              />
              {/* Yellow */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#facc15"
                strokeWidth="8"
                strokeDasharray={yellow}
                strokeDashoffset={circumference - red - yellow}
                initial={{ strokeDashoffset: circumference - red }}
                animate={{ strokeDashoffset: circumference - red - yellow }}
                transition={{ duration: 1, delay: 0.3 }}
              />
              {/* Green */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#22c55e"
                strokeWidth="8"
                strokeDasharray={green}
                strokeDashoffset={circumference - red - yellow - green}
                initial={{ strokeDashoffset: circumference - red - yellow }}
                animate={{ strokeDashoffset: circumference - red - yellow - green }}
                transition={{ duration: 1, delay: 0.6 }}
              />
              {/* CURRENT */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={
                  currentColor === "red"
                    ? "#ef4444"
                    : currentColor === "yellow"
                    ? "#facc15"
                    : "#22c55e"
                }
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={currentSegment}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - currentSegment }}
                transition={{ duration: 1.4, delay: 0.9, ease: "easeOut" }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold">{score}</p>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
          </div>

          {/* TREND LINE */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>7-day trend</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold text-emerald-500">+4</span>
              </div>
            </div>

            <div className="h-16">
              <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                <motion.polyline
                  points={trendData
                    .map(
                      (v, i) =>
                        `${(i / (trendData.length - 1)) * 100},${
                          40 - ((v - 55) / 10) * 40
                        }`
                    )
                    .join(" ")}
                  fill="none"
                  stroke="url(#trendGradient2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2 }}
                />
                <defs>
                  <linearGradient id="trendGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/30 dark:bg-white/5 p-4 backdrop-blur-md shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Reliability
              </p>
              <p className="text-lg font-semibold">62 / 100</p>
              <p className="text-xs text-amber-500">Avg delay 8.3 days</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/30 dark:bg-white/5 p-4 backdrop-blur-md shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Unpaid
              </p>
              <p className="text-lg font-semibold">₹12,200</p>
              <p className="text-xs text-muted-foreground">Invoice FMCC-108</p>
            </div>
          </div>
        </motion.div>

        {/* WHY THIS MATTERS */}
        <motion.div
          className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-white/30 p-6 shadow-xl shadow-primary/20 backdrop-blur-md"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Why this matters</p>
            <Zap className="h-4 w-4 text-primary" />
          </div>

          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              "Say no to chronic late payers before signing.",
              "Escalate faster for clients with low scores.",
              "Price work based on reliability — not guesswork.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
