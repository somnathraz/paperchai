"use client";

import { CheckCircle2, Clock, FileText, LineChart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type FeaturesProps = {
  className?: string;
};

const items = [
  {
    icon: LineChart,
    title: "Client reliability score",
    description: "See who pays late, who ghosts, and who is safe to work with again.",
    glow: "from-emerald-400/10 via-primary/10 to-emerald-400/10",
  },
  {
    icon: Clock,
    title: "Smart WhatsApp + email reminders",
    description: "Soft → medium → firm reminders in your tone, sent automatically.",
    glow: "from-purple-400/10 via-indigo-400/10 to-purple-400/10",
  },
  {
    icon: FileText,
    title: "Invoice + agreement hub",
    description: "Store agreements, PDFs, and email captures in one clean space.",
    glow: "from-sky-400/10 via-blue-400/10 to-sky-400/10",
  },
  {
    icon: CheckCircle2,
    title: "Unpaid dues dashboard",
    description: "See exactly how much is stuck, with which client, and what's next.",
    glow: "from-amber-400/10 via-orange-300/10 to-amber-400/10",
  },
];

export function Features({ className }: FeaturesProps) {
  return (
    <section
      className={cn(
        "relative rounded-3xl border border-white/20 bg-white/70 p-12 sm:p-16 shadow-[0_40px_140px_-60px_rgba(0,0,0,0.25)] backdrop-blur-2xl space-y-12",
        className
      )}
    >
      {/* Section Header */}
      <motion.div
        className="relative space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
      >
        {/* Accent Bar */}
        <div className="flex items-center gap-3">
          <div className="h-1 w-20 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary" />
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Core features</p>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold leading-[1.15]">
          Your money, clients, and reminders—one calm place.
        </h2>

        <p className="max-w-3xl text-muted-foreground leading-relaxed">
          Built for freelancers: reliability, reminders, agreements, and unpaid dues in one lane.
        </p>
      </motion.div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-7">
        {items.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08, duration: 0.45 }}
            whileHover={{ scale: 1.015, y: -4 }}
            className={cn(
              "relative group rounded-2xl p-7 overflow-hidden",
              "border border-white/20 bg-white/55 backdrop-blur-xl",
              "shadow-[0_8px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]",
              "transition-all"
            )}
          >
            {/* Hover Glow */}
            <div
              className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                "bg-gradient-to-br blur-2xl pointer-events-none",
                item.glow
              )}
            />

            {/* Icon Container */}
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-white/30 bg-white/70 backdrop-blur-xl shadow-lg">
              <item.icon className="h-7 w-7 text-primary relative" strokeWidth={2.3} />
            </div>

            {/* Title + Description */}
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
