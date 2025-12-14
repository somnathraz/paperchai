"use client";

import { useState } from "react";
import {
  ArrowRight,
  FileText,
  Mail,
  MessageCircle,
  Slack,
  Sparkles,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DemoMode = "collect" | "send" | "report";

const brandFlow = [
  {
    label: "Notion",
    icon: FileText,
    description: "Contracts import",
    color: "from-slate-700/60 via-slate-900/60 to-slate-800/60",
    glow: "bg-slate-400",
  },
  {
    label: "Slack",
    icon: Sparkles,
    description: "Approvals ping",
    color: "from-purple-600/60 via-purple-700/60 to-indigo-700/60",
    glow: "bg-purple-300",
  },
  {
    label: "Gmail",
    icon: Mail,
    description: "Emails send",
    color: "from-red-500/60 via-red-600/60 to-red-700/60",
    glow: "bg-red-300",
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    description: "Reminders mirror",
    color: "from-emerald-500/60 via-emerald-600/60 to-emerald-700/60",
    glow: "bg-emerald-300",
  },
];

const modes: Record<
  DemoMode,
  {
    title: string;
    summary: string;
    metric: string;
    delta: string;
    tone: string;
    steps: { label: string; detail: string; status: string }[];
  }
> = {
  collect: {
    title: "Collect faster",
    summary: "Polite automation that pays you while you ship work.",
    metric: "₹10.4L in flight",
    delta: "+18% speed",
    tone: "from-primary/30 via-emerald-500/40 to-primary/30",
    steps: [
      { label: "Invoice FMCC-104 cleared", detail: "Autopaid via ACH • 09:12 AM", status: "Live" },
      { label: "Payment link queued", detail: "Outlier Studio • Soft reminder ready", status: "Scheduled" },
      { label: "Receipt delivered", detail: "PDF + Slack summary auto-sent", status: "Done" },
    ],
  },
  send: {
    title: "Send confidently",
    summary: "Late fees, taxes, and deliverables stay consistent every time.",
    metric: "5 live docs",
    delta: "100% consistent",
    tone: "from-purple-500/30 via-indigo-500/40 to-blue-500/30",
    steps: [
      { label: "Proposal signed", detail: "Signature from Nova Labs • 3m ago", status: "Signed" },
      { label: "Auto invoice drafted", detail: "Net-7 + late fee guardrails applied", status: "Ready" },
      { label: "Vaulted payout details", detail: "ACH + virtual card stored", status: "Verified" },
    ],
  },
  report: {
    title: "Report in minutes",
    summary: "Runway, taxes, and client reliability in one clean view.",
    metric: "Runway: 5.6 mo",
    delta: "Cash live",
    tone: "from-amber-500/40 via-orange-500/40 to-rose-500/40",
    steps: [
      { label: "Burn vs. booked", detail: "Coverage 126% next 90 days", status: "Healthy" },
      { label: "Fees isolated", detail: "Platform costs + tax withheld", status: "Tracked" },
      { label: "Audit trail ready", detail: "Exports synced for CPA", status: "Synced" },
    ],
  },
};

export function AutomationReel({ className }: { className?: string }) {
  const [mode, setMode] = useState<DemoMode>("collect");
  const active = modes[mode];

  return (
    <section
      className={cn(
        "space-y-12 rounded-3xl border border-white/20 bg-gradient-to-br from-white/92 via-card/95 to-muted/60 p-10 shadow-[0_36px_150px_-70px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* Header */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
          Automation reel
        </p>
        <h2 className="text-[clamp(1.9rem,3vw,2.6rem)] font-bold leading-tight">
          See the handoff: Notion → Slack → Gmail → WhatsApp.
        </h2>
        <p className="max-w-3xl text-muted-foreground">
          Contracts land from Notion, approvals ping in Slack, emails send via Gmail, and reminders mirror to WhatsApp—while the invoice stays premium.
        </p>
      </motion.div>

      {/* Smooth Flow Animation */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-inner backdrop-blur-md"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="flex flex-wrap items-center justify-center gap-12">
          {brandFlow.map((brand, i) => (
            <motion.div
              key={brand.label}
              className="relative flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
            >
              {/* Icon bubble */}
              <motion.div
                whileHover={{ scale: 1.07 }}
                className={cn(
                  "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg",
                  `bg-gradient-to-br ${brand.color}`
                )}
              >
                <brand.icon className="h-8 w-8" />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full opacity-20 blur-xl",
                    brand.glow
                  )}
                />
              </motion.div>

              <p className="text-sm font-semibold">{brand.label}</p>
              <p className="text-xs text-muted-foreground">{brand.description}</p>

              {/* Animated arrow */}
              {i !== brandFlow.length - 1 && (
                <motion.div
                  className="absolute left-full top-10 ml-3"
                  animate={{ x: [0, 8, 0], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  <ArrowRight className="h-6 w-6 text-muted-foreground/60" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Modes & Steps */}
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Mode Selection + Box */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary shadow">
              Automation demo
            </span>
            <p className="text-sm text-muted-foreground">Pick a lane and see autopilot handle it.</p>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modes) as DemoMode[]).map((m) => (
              <motion.button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition sm:w-auto",
                  mode === m
                    ? "border-primary/60 bg-primary/15 text-primary shadow-lg"
                    : "border-border/80 bg-secondary text-foreground hover:border-primary/40"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {modes[m].title}
              </motion.button>
            ))}
          </div>

          {/* Active Mode Card */}
          <motion.div
            key={mode}
            className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-card via-card/95 to-muted/70 p-6 shadow-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${active.tone} opacity-60 blur-2xl`} />

            {/* Top Row */}
            <div className="relative flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {active.title}
              </p>
              <p className="text-2xl font-semibold">{active.metric}</p>
              <p className="text-sm text-muted-foreground">{active.summary}</p>
            </div>

            {/* Steps */}
            <div className="relative mt-6 space-y-3">
              {active.steps.map((step, i) => (
                <motion.div
                  key={step.label}
                  className="flex items-center justify-between rounded-xl border border-white/20 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-sm"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                >
                  <div>
                    <p className="font-semibold">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>

                  <span className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    <Clock3 className="h-3 w-3" />
                    {step.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Timeline */}
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-6 shadow-xl backdrop-blur-xl"
          initial={{ opacity: 0, x: 18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workflow timeline</p>
            <h3 className="text-xl font-semibold">From first signal to funds cleared</h3>

            {[
              {
                title: "Contract pinned from Notion/Slack",
                detail: "Contracts and SOWs import automatically and attach to the right client.",
              },
              {
                title: "Invoice drafted with late fees",
                detail: "Templates apply net terms, taxes, and late fees without retyping.",
              },
              {
                title: "Soft reminder sent",
                detail: "Soft → medium → firm reminders queue with your tone over email + WhatsApp.",
              },
              {
                title: "Payout matched to bank",
                detail: "Payouts reconcile automatically; taxes split instantly.",
              },
            ].map((step, i, arr) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-white shadow-lg"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, type: "spring", stiffness: 180 }}
                  >
                    {i + 1}
                  </motion.div>

                  {i !== arr.length - 1 && (
                    <motion.div
                      className="h-12 w-px bg-gradient-to-b from-primary via-emerald-500 to-primary/60"
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.2, duration: 0.5 }}
                    />
                  )}
                </div>

                {/* Step card */}
                <motion.div
                  className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md shadow-sm"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 + 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{step.title}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
                      <BadgeCheck className="h-3 w-3" />
                      Live
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
