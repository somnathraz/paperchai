"use client";

import { TemplateProps } from "./types";

/**
 * Neo Dark - Dark mode invoice
 * Layout: Dark cards | Table with neon hover | Right sticky totals
 */
export function NeoDark({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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
        <div className="h-full rounded-xl border border-white/40 bg-slate-900 shadow-inner p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/70">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">Pro</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-2/3 rounded-full bg-white/40" />
            <div className="h-2 w-1/2 rounded-full bg-white/40" />
            <div className="mt-2 space-y-1 rounded-lg border border-cyan-500/30 bg-slate-800/50 p-2">
              <div className="h-2 w-full rounded-full bg-cyan-500/40" />
              <div className="h-2 w-4/5 rounded-full bg-cyan-500/40" />
            </div>
            <div className="mt-2 flex items-center justify-end text-[11px] font-semibold text-cyan-400">
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-[#0B0F14] text-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Section 1: Header */}
        <div className="px-12 pt-12 pb-8 bg-[#1E293B] border-b border-white/10">
          <h1 className="text-[22px] font-semibold mb-2 tracking-tight">{data.businessName}</h1>
          <div className="flex items-center gap-3 text-[13px] text-white/60">
            <span>Invoice #{data.invoiceNumber}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Section 2: Client Card */}
        <div className="px-12 py-8 bg-[#1E293B] border-b border-white/10">
          <p className="text-[13px] font-semibold mb-2 text-white/60 uppercase tracking-wide">Bill To:</p>
          <p className="text-[16px] text-white leading-relaxed">{data.clientName}</p>
        </div>

        {/* Section 3: Table with Neon Hover */}
        <div className="px-12 py-8 flex-1 bg-[#1E293B]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-[12px] font-semibold text-cyan-400 uppercase tracking-wide">Description</th>
                <th className="text-right py-3 px-4 text-[12px] font-semibold text-cyan-400 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/10 hover:bg-cyan-500/10 transition-colors"
                >
                  <td className="py-4 px-4 text-[14px] text-white leading-relaxed">{item.name}</td>
                  <td className="py-4 px-4 text-right text-[14px] font-semibold text-cyan-400">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Totals */}
        <div className="px-12 py-8 bg-[#1E293B] border-t border-cyan-500/30">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold text-cyan-400">Total Amount</span>
            <span className="text-[22px] font-bold text-cyan-400">{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 p-6 bg-[#1E293B] rounded-2xl border border-white/10">
          <h1 className="text-3xl font-bold mb-2">{data.businessName}</h1>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>Invoice #{data.invoiceNumber}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Client Card */}
        <div className="mb-6 p-4 bg-[#1E293B] rounded-xl border border-white/10">
          <p className="text-sm text-white/60 mb-1">Bill To:</p>
          <p className="text-lg font-semibold">{data.clientName}</p>
        </div>

        {/* Table with Neon Hover */}
        <div className="mb-6 bg-[#1E293B] rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left py-4 px-4 text-sm font-semibold text-cyan-400">Description</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-cyan-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/10 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-4">{item.name}</td>
                  <td className="py-4 px-4 text-right font-semibold text-cyan-400">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Sticky Totals */}
        <div className="sticky bottom-0 p-6 bg-[#1E293B] rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold text-cyan-400">Total Amount</span>
            <span className="text-3xl font-bold text-cyan-400">{data.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

