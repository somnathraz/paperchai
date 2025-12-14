"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

export function AICommandBar() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="rounded-2xl border border-white/20 bg-slate-950/90 p-4 text-slate-100 shadow-[0_20px_80px_-60px_rgba(15,23,42,0.9)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        <Sparkles className="h-4 w-4 text-amber-300" />
        PaperChai AI
      </div>
      <p className="mt-2 text-sm text-slate-200">Describe the invoice and let autopilot fill the rest.</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-3 py-2">
        <input
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
          placeholder="Invoice for Nova Labs — homepage redesign, same rates as last month."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20">
          Generate
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
