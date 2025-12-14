"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, Send, FileText, MessageCircle, Receipt, UserPlus, Upload, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const actions = [
  { label: "Create invoice", icon: FileText },
  { label: "Send reminder", icon: Send },
  { label: "Add payment", icon: Receipt },
  { label: "Generate recap", icon: Sparkles },
  { label: "Add client", icon: UserPlus },
  { label: "Upload agreement", icon: Upload },
  { label: "Quick WhatsApp reminder", icon: MessageCircle },
];

export function FabActions() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_30px_60px_-20px_rgba(16,185,129,0.6)]"
      >
        <Plus className="h-4 w-4" />
        New
        <kbd className="ml-2 hidden rounded bg-black/20 px-2 py-1 text-[10px] uppercase tracking-wide text-primary-foreground/70 sm:inline">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute bottom-20 right-6 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f172a]/95 p-4 shadow-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">New action</h3>
                <button className="rounded-full border border-white/10 p-1 text-white/60" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-white/60">Choose what autopilot should do next.</p>
              <div className="mt-3 space-y-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <action.icon className="h-4 w-4 text-primary" />
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
