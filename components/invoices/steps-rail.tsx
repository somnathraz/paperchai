"use client";

import { User, FileText, LayoutList, Receipt, Percent, StickyNote, Brush, Send } from "lucide-react";

type StepsRailProps = {
  steps: string[];
  activeStep: number;
  onStepChange: (step: number) => void;
};

const icons = [User, FileText, LayoutList, Receipt, Percent, StickyNote, Brush, Send];

export function StepsRail({ steps, activeStep, onStepChange }: StepsRailProps) {
  return (
    <aside className="sticky top-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.12)]">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Steps</p>
      <ul className="mt-4 space-y-2 text-sm">
        {steps.map((step, idx) => {
          const status = idx < activeStep ? "done" : idx === activeStep ? "active" : "todo";
          const Icon = icons[idx] || FileText;
          return (
            <li key={step}>
              <button
                onClick={() => onStepChange(idx)}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  status === "active"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-transparent bg-slate-50 text-muted-foreground hover:border-slate-200"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "active"
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {status === "done" ? "✓" : idx + 1}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 truncate text-sm">{step}</div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
