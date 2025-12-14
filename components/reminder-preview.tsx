"use client";

import { Clock, Mail, MessageCircle, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ReminderPreviewProps = {
  className?: string;
};

export function ReminderPreview({ className }: ReminderPreviewProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/20 bg-gradient-to-br from-white/95 via-card/95 to-muted/60 p-10 shadow-[0_32px_100px_-40px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* HEADER */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
          Reminder preview
        </p>
        <h3 className="text-2xl font-semibold">How your client will see it</h3>
        <p className="text-muted-foreground max-w-xl">
          Soft, human reminders that match your tone—sent automatically over email
          and WhatsApp.
        </p>
      </motion.div>

      {/* GRID */}
      <div className="mt-10 grid gap-10 sm:grid-cols-[1.1fr_0.9fr]">

        {/* ---------------------------------------------------------------- */}
        {/*                            GMAIL MOCKUP                          */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:bg-white/10"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* iPhone-style edge */}
          <div className="absolute inset-0 rounded-3xl border-[6px] border-white/40 shadow-inner pointer-events-none" />

          {/* Gmail Header */}
          <div className="border-b border-white/20 bg-gradient-to-r from-red-500/10 to-red-600/10 px-4 py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Gmail</p>
                <p className="text-[11px] text-muted-foreground">Soft tone reminder</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                <Volume2 className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary">Soft</span>
              </div>
            </div>
          </div>

          {/* Gmail Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-500 shadow-md" />

              <div className="flex-1 space-y-2">
                {/* From → To */}
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-semibold">You</span>
                  <span className="text-muted-foreground">&lt;you@paperchai.com&gt;</span>
                  <span className="text-muted-foreground">to Ankit</span>
                </div>

                {/* Email Card */}
                <div className="rounded-xl border border-white/20 bg-white/80 p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-xl space-y-3 text-sm">
                  <p className="text-foreground/90">
                    Hey Ankit — hope you&apos;re doing well! Dropping a soft reminder for
                    Invoice #108 (₹18,200).
                  </p>

                  <p className="text-foreground/90">
                    Here’s your secure payment link:{" "}
                    <span className="font-semibold text-primary underline decoration-primary/30">
                      pay.paperchai.com/fmcc-108
                    </span>
                  </p>

                  {/* Next Reminder */}
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1 text-[11px]">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Next reminder: Tuesday 10 AM (medium tone)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/*                           WHATSAPP MOCKUP                        */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-emerald-50/50 via-white/70 to-emerald-50/40 shadow-2xl backdrop-blur-xl dark:bg-white/10"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* iPhone-style edge */}
          <div className="absolute inset-0 rounded-3xl border-[6px] border-white/40 shadow-inner pointer-events-none" />

          {/* WhatsApp Header */}
          <div className="border-b border-white/20 bg-gradient-to-r from-emerald-500/15 to-emerald-600/15 px-4 py-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold">WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">Soft tone reminder</p>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1">
                <Volume2 className="h-3 w-3 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-600">Soft</span>
              </div>
            </div>
          </div>

          {/* Chat Body */}
          <div className="p-4 space-y-3">
            {/* Message 1 */}
            <motion.div
              className="flex justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm text-white shadow-lg">
                <p>Hi Ankit 👋</p>
                <p className="mt-1">Soft nudge for Invoice #108 (₹18,200).</p>
              </div>
            </motion.div>

            {/* Message 2 */}
            <motion.div
              className="flex justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm text-white shadow-lg">
                <p>Pay securely here:</p>
                <p className="mt-1 font-semibold underline decoration-white/30">
                  pay.paperchai.com/fmcc-108
                </p>
              </div>
            </motion.div>

            {/* Typing Indicator */}
            <motion.div
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex gap-1 rounded-full bg-white/70 px-2 py-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <span>Next: Medium on Tue 10 AM</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
