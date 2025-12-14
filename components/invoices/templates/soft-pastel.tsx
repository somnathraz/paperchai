"use client";

import { TemplateProps } from "./types";

/**
 * Soft Pastel - Soft, friendly, freelancer-friendly
 * Layout: Banner Stripe | Client box | Items box | Totals box | QR Code payment block
 */
export function SoftPastel({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4">
          <div className="h-3 w-full rounded-lg bg-gradient-to-r from-emerald-200 via-rose-200 to-purple-200 mb-3" />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>
          <div className="mt-2 space-y-1.5 rounded-lg bg-emerald-50/50 p-2">
            <div className="h-2 w-full rounded-full bg-slate-300" />
            <div className="h-2 w-4/5 rounded-full bg-slate-300" />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-rose-50/50 p-2 text-[11px] font-semibold text-slate-700">
            <span>Total</span>
            <span>{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-rose-50 via-emerald-50 to-purple-50 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Section 1: Banner Stripe */}
        <div className="h-3 bg-gradient-to-r from-rose-200 via-emerald-200 to-purple-200" />

        {/* Section 2: Client Box */}
        <div className="px-12 pt-12 pb-8 bg-white/80 border-b border-rose-200/50">
          <h2 className="text-[22px] font-semibold text-rose-600 mb-2 tracking-tight">INVOICE</h2>
          <p className="text-[13px] text-[#666666] mb-4">#{data.invoiceNumber}</p>
          <div>
            <p className="text-[13px] text-[#666666] mb-2 uppercase tracking-wide">Bill To:</p>
            <p className="text-[16px] font-semibold text-[#111111] leading-relaxed">{data.clientName}</p>
          </div>
        </div>

        {/* Section 3: Items Box */}
        <div className="px-12 py-8 flex-1 bg-white/80 border-b border-emerald-200/50">
          <h3 className="text-[13px] font-semibold text-emerald-700 mb-4 uppercase tracking-wide">Items</h3>
          <div className="space-y-3">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between py-3 border-b border-emerald-100">
                <span className="text-[14px] text-[#111111] leading-relaxed">{item.name}</span>
                <span className="text-[14px] font-semibold text-emerald-700">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Totals Box */}
        <div className="px-12 py-8 bg-white/80 border-b border-purple-200/50">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold text-purple-700">Total Amount</span>
            <span className="text-[22px] font-bold text-purple-800">{data.total}</span>
          </div>
        </div>

        {/* Section 5: QR Code Block */}
        <div className="px-12 py-8 bg-white/80 text-center">
          <div className="w-24 h-24 mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-3">
            <span className="text-[13px] text-slate-400">QR</span>
          </div>
          <p className="text-[13px] text-[#666666]">Scan to pay</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-lavender-50 p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Banner Stripe */}
        <div className="h-4 rounded-t-2xl bg-gradient-to-r from-rose-200 via-emerald-200 to-lavender-200" />

        {/* Client Box */}
        <div className="rounded-2xl bg-white/80 p-6 border border-rose-200/50 shadow-sm">
          <h2 className="text-2xl font-bold text-rose-600 mb-2">INVOICE</h2>
          <p className="text-sm text-slate-600">#{data.invoiceNumber}</p>
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-1">Bill To:</p>
            <p className="text-lg font-semibold text-slate-800">{data.clientName}</p>
          </div>
        </div>

        {/* Items Box */}
        <div className="rounded-2xl bg-white/80 p-6 border border-emerald-200/50 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700 mb-4">Items</h3>
          <div className="space-y-3">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-emerald-100">
                <span className="text-slate-700">{item.name}</span>
                <span className="font-semibold text-emerald-700">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Box */}
        <div className="rounded-2xl bg-white/80 p-6 border border-purple-200/50 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-purple-700">Total Amount</span>
            <span className="text-3xl font-bold text-purple-800">{data.total}</span>
          </div>
        </div>

        {/* QR Code Block */}
        <div className="rounded-2xl bg-white/80 p-6 border border-rose-200/50 shadow-sm text-center">
          <div className="w-32 h-32 mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-2">
            <span className="text-xs text-slate-400">QR Code</span>
          </div>
          <p className="text-sm text-slate-600">Scan to pay</p>
        </div>
      </div>
    </div>
  );
}

