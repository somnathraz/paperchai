"use client";

import { TemplateProps } from "./types";

/**
 * Gradient Aura - Gradient backgrounds, fancy UI
 * Layout: Gradient header | White content cards | Floating totals
 */
export function GradientAura({ preview = false, modalPreview = false, mockData }: TemplateProps) {
  const data = mockData || {
    businessName: "Your Business",
    invoiceNumber: "INV-2024-001",
    clientName: "Client Name",
    total: "₹24,600",
    items: [
      { name: "Service Item 1", amount: "₹12,000" },
      { name: "Service Item 2", amount: "₹12,600" },
    ],
  };

  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 to-white p-4 shadow-inner">
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 opacity-20" />
          <div className="relative z-10 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">Pro</span>
          </div>
          <div className="relative z-10 mt-3 space-y-2 rounded-lg bg-white/90 p-3">
            <div className="h-2 w-full rounded-full bg-slate-300" />
            <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-purple-700">
              <span>Total</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 text-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Section 1: Gradient Header */}
        <div className="px-12 pt-12 pb-8 bg-white/10 backdrop-blur-lg border-b border-white/20">
          <h1 className="text-[22px] font-semibold mb-2 tracking-tight">{data.businessName}</h1>
          <div className="flex items-center gap-3 text-[13px] text-white/80">
            <span>Invoice #{data.invoiceNumber}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Section 2: White Content Card */}
        <div className="px-12 py-8 flex-1 bg-white text-slate-800">
          <div className="mb-6">
            <p className="text-[13px] font-semibold mb-2 text-slate-500 uppercase tracking-wide">Bill To:</p>
            <p className="text-[16px] font-semibold text-slate-800 leading-relaxed">{data.clientName}</p>
          </div>

          <div className="space-y-4 mb-6">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-[14px] text-slate-700 leading-relaxed">{item.name}</span>
                <span className="text-[14px] font-semibold text-purple-600">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Floating Totals */}
        <div className="px-12 py-8 bg-white/10 backdrop-blur-lg border-t border-white/20">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold">Total Amount</span>
            <span className="text-[22px] font-bold">{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Gradient Header */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-lg p-8 border border-white/20">
          <h1 className="text-4xl font-bold mb-2">{data.businessName}</h1>
          <div className="flex items-center gap-4 text-white/80">
            <span>Invoice #{data.invoiceNumber}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* White Content Cards */}
        <div className="rounded-3xl bg-white text-slate-800 p-8 shadow-2xl">
          <div className="mb-6">
            <p className="text-sm text-slate-500 mb-2">Bill To:</p>
            <p className="text-xl font-semibold">{data.clientName}</p>
          </div>

          <div className="space-y-4 mb-6">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-700">{item.name}</span>
                <span className="font-semibold text-purple-600">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Totals */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-lg p-8 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-semibold">Total Amount</span>
            <span className="text-4xl font-bold">{data.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

