"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, MessageCircle, ShieldCheck, Mail, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type FAQItem = {
  q: string;
  a: string;
  icon: any;
};

const faqs: FAQItem[] = [
  {
    q: "Will my clients see PaperChai branding?",
    a: "No. Reminders and invoices carry your name, your email, and your tone. PaperChai stays completely invisible to clients.",
    icon: Sparkles,
  },
  {
    q: "Does this replace my invoice tool?",
    a: "You can import existing PDFs, or generate new invoices with guardrails like net terms and late fees. Use whichever fits your workflow.",
    icon: Mail,
  },
  {
    q: "Do reminders really send automatically?",
    a: "Yes. Soft → medium → firm reminders queue automatically to WhatsApp + email in your exact tone and cadence.",
    icon: MessageCircle,
  },
  {
    q: "Is WhatsApp sending allowed?",
    a: "Yes. We follow opt-in rules and use polite cadence so your clients are never spammed — just nudged gently.",
    icon: ShieldCheck,
  },
  {
    q: "How does the reliability score work?",
    a: "PaperChai analyzes each client's payment speed, consistency, and reminder responsiveness to generate a trust score from 0–100.",
    icon: Zap,
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="space-y-10 rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 shadow-[0_36px_160px_-80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-14">
      
      {/* Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          FAQ
        </p>
        <h3 className="text-3xl font-bold leading-tight">Quick answers for freelancers.</h3>
        <p className="text-sm text-muted-foreground">Everything important — short and clear.</p>
      </motion.div>

      {/* FAQ List */}
      <div className="space-y-4">
        {faqs.map((item, idx) => {
          const openState = open === idx;

          return (
            <motion.div
              key={idx}
              className={cn(
                "rounded-2xl border border-white/20 bg-white/50 backdrop-blur-xl p-5 shadow-md dark:bg-white/10",
                openState && "border-primary/40 shadow-primary/20"
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
            >
              <button
                className="flex w-full items-center justify-between gap-4"
                onClick={() => setOpen(openState ? null : idx)}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-foreground">{item.q}</span>
                </div>

                <motion.div
                  animate={{ rotate: openState ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </button>

              {/* Answer */}
              <AnimatePresence>
                {openState && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed pl-[3.8rem]">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
