"use client";

import {
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  MessageCircle,
  FileText,
  DollarSign,
} from "lucide-react";

import { motion, useMotionValue, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import DashboardDemo from "./dashboard-demo";

// --------------------------------------------------
// FINAL PREMIUM HERO – PaperChai
// --------------------------------------------------
export default function Hero() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  // Cinematic tilt
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rX = useTransform(mvY, [-80, 80], [5, -5]);
  const rY = useTransform(mvX, [-80, 80], [-4, 4]);

  const onMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mvX.set(e.clientX - (rect.left + rect.width / 2));
    mvY.set(e.clientY - (rect.top + rect.height / 2));
  };
  const onLeave = () => {
    mvX.set(0);
    mvY.set(0);
  };

  // Floating Chips - moved further from dashboard corners (8-10px more padding)
  const chips = [
    { label: "Invoices", icon: FileText, x: "-8%", y: "20%", d: 0 },
    { label: "Reliability", icon: ShieldCheck, x: "108%", y: "24%", d: 0.3 },
    { label: "Payments", icon: DollarSign, x: "-6%", y: "72%", d: 0.6 },
    { label: "Reminders", icon: MessageCircle, x: "104%", y: "77%", d: 0.9 },
  ];

  // Floating Emojis
  const emojis = [
    { e: "₹", x: "14%", y: "8%", d: 0 },
    { e: "⚡", x: "88%", y: "10%", d: 0.4 },
    { e: "📊", x: "12%", y: "92%", d: 0.8 },
    { e: "💬", x: "90%", y: "90%", d: 1.2 },
  ];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pt-20 sm:pt-24 md:pt-28 lg:pt-8 pb-12 sm:pb-16 md:pb-20 mb-0 md:mb-4"
    >
      {/* -------------------------------------------------- */}
      {/* BACKGROUND → Clean, Premium, Real SaaS */}
      {/* -------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(255,255,255,0.10),transparent_55%)]" />

        {/* Spotlight - reduced intensity by 20% */}
        <motion.div
          className="absolute left-1/2 top-1/2 w-[540px] h-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/12 blur-3xl"
          animate={{ opacity: [0.15, 0.32, 0.15], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        {/* Light Noise */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==)",
          }}
        />
      </div>

      {/* -------------------------------------------------- */}
      {/* GRID */}
      {/* -------------------------------------------------- */}
      <div className="relative z-10 shell grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-14 items-center">
        {/* -------------------------------------------------- */}
        {/* LEFT */}
        {/* -------------------------------------------------- */}
        <div className="space-y-6 sm:space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border border-white/30 bg-white/70 backdrop-blur-xl text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.20em] sm:tracking-[0.22em] shadow-lg"
          >
            PaperChai · Money Autopilot
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight"
          >
            <span className="block bg-gradient-to-b from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Stop chasing clients.
            </span>
            <span className="block mt-2 sm:mt-3 bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
              Start tracking them like a pro.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.55 }}
            className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-xl leading-relaxed"
          >
            PaperChai shows who pays on time, who delays, and sends smart email + WhatsApp reminders
            in your exact tone.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.22, duration: 0.6 }}
          >
            {/* Primary */}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative group flex items-center justify-center gap-2 rounded-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary via-emerald-500 to-primary text-white font-semibold shadow-[0_8px_32px_rgba(16,185,129,0.45)] text-sm sm:text-base"
            >
              <span className="relative z-10">Get started free</span>
              <ArrowRight className="relative z-10 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition" />
              {/* Shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent rounded-full"
                initial={{ x: "-120%" }}
                whileHover={{ x: "120%" }}
                transition={{ duration: 0.7 }}
              />
            </motion.button>

            {/* Secondary */}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative flex items-center justify-center gap-2 rounded-full px-6 sm:px-8 py-3 sm:py-4 bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg font-semibold text-foreground text-sm sm:text-base"
            >
              <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Watch 30s demo
            </motion.button>
          </motion.div>
        </div>

        {/* -------------------------------------------------- */}
        {/* RIGHT – CINEMATIC DASHBOARD */}
        {/* -------------------------------------------------- */}
        <div className="relative">
          {/* Floating Chips */}
          {chips.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                className="absolute z-30"
                style={{ left: c.x, top: c.y }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.6, 1, 0.6],
                  scale: [1, 1.025, 1],
                }}
                transition={{
                  duration: 4 + i * 0.4,
                  repeat: Infinity,
                  delay: c.d,
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 border border-white/30 shadow-md backdrop-blur-xl">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">{c.label}</span>
                </div>
              </motion.div>
            );
          })}

          {/* Emojis */}
          {emojis.map((e, i) => (
            <motion.div
              key={i}
              style={{ left: e.x, top: e.y }}
              className="absolute text-3xl z-40 opacity-40"
              animate={{
                y: [0, -14, 0],
                rotate: [0, 10, -10, 0],
                scale: [1, 1.01, 1],
              }}
              transition={{
                duration: 5 + i * 0.4,
                repeat: Infinity,
                delay: e.d,
              }}
            >
              {e.e}
            </motion.div>
          ))}

          {/* Dashboard - lowered by 15px more for better spacing */}
          <motion.div
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ rotateX: rX, rotateY: rY }}
            className="relative mt-20 overflow-hidden rounded-[30px] border border-white/40 bg-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Glow - reduced intensity */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-emerald-500/15 blur-2xl opacity-40" />

            {/* Dashboard Frame - added vertical padding for balance */}
            <div className="relative z-10 p-4 pt-7">
              <DashboardDemo />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
