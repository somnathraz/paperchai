"use client";

import { ShieldCheck, TimerReset } from "lucide-react";

export function ReliabilityCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/70 p-4 text-sm text-emerald-900 shadow-inner shadow-emerald-200/40">
      <div className="flex items-center gap-2 text-emerald-800">
        <ShieldCheck className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Reliability</p>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-semibold text-emerald-900">92</p>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Healthy</p>
        </div>
        <div className="text-right text-xs text-emerald-700">
          Avg delay: <span className="font-semibold text-emerald-900">4.1 days</span>
          <br />
          Lifetime billed: <span className="font-semibold text-emerald-900">₹3.2L</span>
        </div>
      </div>
      <div className="rounded-xl bg-white/60 p-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2 font-semibold">
          <TimerReset className="h-4 w-4" />
          Suggested cadence
        </div>
        <p className="mt-1 text-emerald-800">Soft reminder in 3 days, firm follow-up after 8 days.</p>
      </div>
    </div>
  );
}
