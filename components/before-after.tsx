"use client";

import {
  X,
  Check,
  AlertTriangle,
  FileText,
  MessageSquare,
  Clock,
  DollarSign,
  CheckCircle2,
  Zap,
  TrendingUp,
  FolderOpen,
  Calendar,
} from "lucide-react";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BeforeAfterProps = { className?: string };

const beforeList = [
  { text: "Scattered PDFs across email", icon: FileText },
  { text: "12 unread WhatsApp messages", icon: MessageSquare },
  { text: "Manual reminder writing", icon: Clock },
  { text: "No tracking on overdue payments", icon: AlertTriangle },
  { text: "Forgetting who owes what", icon: DollarSign },
];

const afterList = [
  { text: "One calm dashboard", icon: CheckCircle2 },
  { text: "Reminders sent automatically", icon: Zap },
  { text: "Clear reliability score per client", icon: TrendingUp },
  { text: "Agreement gists in one place", icon: FolderOpen },
  { text: "Predictable, on-time cash", icon: Calendar },
];

export function BeforeAfter({ className }: BeforeAfterProps) {
  return (
    <section
      className={cn(
        "relative rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 sm:p-14 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl",
        className
      )}
    >
      {/* Header */}
      <motion.div
        className="mb-10 space-y-3 text-center sm:mb-14"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold sm:text-4xl">Before → After</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          The shift from chaos to calm cash flow. See how freelancers work <span className="text-foreground font-medium">before PaperChai</span> — and how their workflow feels <span className="text-foreground font-medium">after automation</span>.
        </p>
      </motion.div>

      {/* 2-Column Layout */}
      <div className="grid gap-10 sm:grid-cols-2">
        
        {/* BEFORE CARD */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-red-500/15 bg-white/20 p-8 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all"
        >
          {/* Soft red glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-40 blur-2xl pointer-events-none" />

          <div className="relative space-y-6">
            {/* Label */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-500 shadow-inner">
                <X className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500/80">
                Before PaperChai
              </p>
            </div>

            {/* List */}
            <ul className="space-y-3">
              {beforeList.map((item, i) => (
                <motion.li
                  key={item.text}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm hover:bg-white/20 hover:shadow-md transition-all"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground/90 leading-relaxed">
                    {item.text}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* AFTER CARD */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-white/30 p-8 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all"
        >
          {/* Soft green glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 via-emerald-500/10 to-transparent opacity-50 blur-2xl pointer-events-none" />

          <div className="relative space-y-6">
            {/* Label */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-inner">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/90">
                After PaperChai
              </p>
            </div>

            {/* List */}
            <ul className="space-y-3">
              {afterList.map((item, i) => (
                <motion.li
                  key={item.text}
                  initial={{ opacity: 0, x: 8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 backdrop-blur-sm hover:bg-primary/15 hover:shadow-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground/90 leading-relaxed">
                    {item.text}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
