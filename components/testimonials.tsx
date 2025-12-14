"use client";

import { motion } from "framer-motion";
import { Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type TestimonialsProps = {
  className?: string;
};

const testimonials = [
  {
    name: "Ayesha • Product Designer",
    quote: "PaperChai saved me 5+ hours weekly. Clients pay faster because reminders feel human.",
    avatar: "A",
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Rohit • Frontend Engineer",
    quote: "A client paid after 3 weeks of ghosting — smart reminders + reliability score did the job.",
    avatar: "R",
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Maria • Studio Lead",
    quote: "Reliability scoring changed how we price work. Calm money. Predictable payments.",
    avatar: "M",
    color: "from-emerald-500 to-teal-500",
  },
  {
    name: "Ishaan • Consultant",
    quote: "The WhatsApp + email reminder combo feels magical. No awkwardness, still effective.",
    avatar: "I",
    color: "from-orange-500 to-rose-500",
  },
  {
    name: "Tara • Branding Studio",
    quote: "Month-end recap is so aesthetic clients think we hired a finance team 😂",
    avatar: "T",
    color: "from-yellow-500 to-amber-500",
  },
];

export function Testimonials({ className }: TestimonialsProps) {
  return (
    <section
      className={cn(
        "space-y-10 rounded-3xl border border-white/20 bg-gradient-to-br from-white/90 via-card/95 to-muted/60 p-10 shadow-[0_36px_150px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-14",
        className
      )}
    >
      {/* Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
            Social proof
          </p>
        </div>

        <h3 className="text-3xl font-bold leading-tight">
          Freelancers who stopped chasing.
        </h3>

        <p className="text-sm text-muted-foreground">Trusted by 1,200+ freelancers</p>
      </motion.div>

      {/* Infinite Auto-Marquee */}
      <div className="relative overflow-hidden">
        
        {/* Left fade - matches top-left of section background */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-white/90 to-transparent z-10" />

        {/* Right fade - matches bottom-right of section background (muted/60) */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-muted/60 via-card/95 to-transparent z-10" />

        <motion.div
          className="flex gap-6 py-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...testimonials, ...testimonials].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className="relative min-w-[320px] max-w-[360px] overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-xl backdrop-blur-xl dark:bg-white/10"
            >
              {/* Glow */}
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-20 blur-xl",
                  item.color
                )}
              />

              <div className="relative flex gap-4">
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg",
                    item.color
                  )}
                >
                  {item.avatar}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>

                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="h-3 w-3 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                “{item.quote}”
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
