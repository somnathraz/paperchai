"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type FinalCTAProps = {
  className?: string;
};

export function FinalCTA({ className }: FinalCTAProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 px-10 py-16 shadow-[0_40px_160px_-60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:px-16",
        className
      )}
    >
      {/* Soft glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(99,102,241,0.12),transparent_40%)] pointer-events-none" />

      <motion.div
        className="relative mx-auto max-w-3xl text-center space-y-5"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Heading badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Money Autopilot
        </div>

        <h2 className="text-[clamp(2rem,3vw,2.8rem)] font-bold leading-tight">
          Stop chasing. Start getting paid—automatically.
        </h2>

        <p className="mx-auto max-w-xl text-muted-foreground">
          Join 1,200+ freelancers who use PaperChai to track clients, send smart reminders, 
          and get paid on time—without awkward follow-ups.
        </p>

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
          <motion.a
            href="/login"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-emerald-500 px-8 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/40 hover:shadow-2xl transition"
          >
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </motion.a>

          <motion.a
            href="#features"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-8 py-3 text-sm font-semibold text-primary shadow-md"
          >
            Explore features
          </motion.a>
        </div>

        {/* Mini trust statement */}
        <p className="text-xs text-muted-foreground pt-2">
          No credit card required · Setup in 2 minutes · Safe for clients  
        </p>
      </motion.div>
    </section>
  );
}
