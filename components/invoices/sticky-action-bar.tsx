"use client";

import { ArrowLeft, Send, Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StickyActionBarProps = {
  variant?: "light" | "dark";
  onSaveDraft?: () => void;
  saving?: boolean;
};

export function StickyActionBar({ variant = "dark", onSaveDraft, saving }: StickyActionBarProps) {
  const containerStyles =
    variant === "dark"
      ? "border-white/10 bg-slate-950/85 text-white"
      : "border-white/10 bg-white/90 text-slate-900";

  const mutedText = variant === "dark" ? "text-white/70" : "text-muted-foreground";

  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 px-4 py-3 shadow-[0_-20px_80px_-60px_rgba(15,23,42,0.7)] backdrop-blur-xl", containerStyles)}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className={cn("flex items-center gap-2 text-sm", mutedText)}>
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 transition",
              variant === "dark"
                ? "border-white/20 text-white/80 hover:text-white"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
            onClick={onSaveDraft}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 transition",
              variant === "dark"
                ? "border-white/20 text-white/80 hover:text-white"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-4 w-4" />
            Schedule
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-2 text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50">
            Send invoice
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
