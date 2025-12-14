"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const nav = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "backdrop-blur-xl bg-white/40 border-b border-white/20" : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Container */}
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "mt-4 mb-4 flex items-center justify-between rounded-full px-6 py-3 transition-all",
            "border border-white/20 bg-white/55 backdrop-blur-xl shadow-[0_6px_22px_rgba(0,0,0,0.06)]",
            scrolled && "shadow-[0_8px_28px_rgba(0,0,0,0.1)]"
          )}
        >
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300">
              <span className="text-[10px] font-bold tracking-tight">●</span>
            </div>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 font-medium">
                PaperChai
              </p>
              <p className="text-[12px] font-semibold text-neutral-800">
                Money Autopilot
              </p>
            </div>
          </Link>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative text-sm font-medium text-neutral-600 hover:text-neutral-900 transition"
              >
                {l.label}
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-neutral-900 transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex">
            <Link href="/login" className="group relative flex items-center gap-2 rounded-full bg-black text-white px-5 py-2.5 text-sm font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all">
              <span>Get early access</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden rounded-lg p-2 bg-white/60 border border-white/30 backdrop-blur-lg"
          >
            <Menu className="h-5 w-5 text-neutral-900" />
          </button>
        </motion.div>
      </div>

      {/* MOBILE DRAWER */}
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="absolute right-0 top-0 h-full w-[75%] max-w-xs bg-white/85 backdrop-blur-xl border-l border-white/30 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 p-2">
              <X className="h-5 w-5 text-neutral-600" />
            </button>

            {/* Mobile Nav */}
            <div className="mt-14 flex flex-col gap-6 text-lg font-medium">
              {nav.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href="/login"
                className="w-full rounded-full bg-black text-white py-3 font-semibold shadow-lg inline-flex items-center justify-center"
                onClick={() => setOpen(false)}
              >
                Get early access
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </header>
  );
}
