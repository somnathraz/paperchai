"use client";

import { TemplateProps } from "./types";

/**
 * Multi-Brand Dynamic - Multi-logo, multi-brand invoice
 * Layout: Upload multiple brand logos | Switch brand identity per invoice | Brand color theme
 */
export function MultiBrandDynamic({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">Pro</span>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-primary/20 to-emerald-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-300" />
              <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-primary">
            <span>Total</span>
            <span>{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white text-[#111111] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Section 1: Brand Header */}
        <div className="px-12 pt-12 pb-8 bg-[#F8F9FA] border-b border-[#EAEAEA]">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white font-semibold text-lg">
              {data.businessName?.charAt(0) || "B"}
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-primary mb-1 tracking-tight">{data.businessName || "Your Business"}</h1>
              <p className="text-[13px] text-[#666666]">Invoice #{data.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 text-[11px] font-semibold bg-primary/10 text-primary rounded-full">Brand 1</div>
            <div className="px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full">Brand 2</div>
            <div className="px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full">Brand 3</div>
          </div>
        </div>

        {/* Section 2: Client */}
        <div className="px-12 py-8 border-b border-[#EAEAEA]">
          <p className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">Bill To:</p>
          <p className="text-[16px] font-semibold text-primary leading-relaxed">{data.clientName}</p>
        </div>

        {/* Section 3: Items */}
        <div className="px-12 py-8 flex-1 bg-[#F8F9FA]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary/20">
                <th className="text-left py-3 px-4 text-[12px] font-semibold text-primary uppercase tracking-wide">Description</th>
                <th className="text-right py-3 px-4 text-[12px] font-semibold text-primary uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, idx) => (
                <tr key={idx} className={`border-b border-primary/10 ${idx % 2 === 0 ? "bg-white" : "bg-primary/5"}`}>
                  <td className="py-4 px-4 text-[14px] text-[#111111] leading-relaxed">{item.name}</td>
                  <td className="py-4 px-4 text-right text-[14px] font-semibold text-primary">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Total */}
        <div className="px-12 py-8 bg-gradient-to-r from-primary to-emerald-500 text-white">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold">Total Amount</span>
            <span className="text-[22px] font-bold">{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-emerald-50 to-white p-8">
      <div className="mx-auto max-w-4xl">
        {/* Brand Header */}
        <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-primary/20 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white font-bold text-xl">
              {data.businessName?.charAt(0) || "B"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">{data.businessName || "Your Business"}</h1>
              <p className="text-sm text-slate-600">Invoice #{data.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">Brand 1</div>
            <div className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">Brand 2</div>
            <div className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">Brand 3</div>
          </div>
        </div>

        {/* Client */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-primary/10">
          <p className="text-sm text-slate-500 mb-1">Bill To:</p>
          <p className="text-lg font-semibold text-primary">{data.clientName}</p>
        </div>

        {/* Items */}
        <div className="mb-6 bg-white rounded-xl border border-primary/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/5">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Description</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-primary">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, idx) => (
                <tr key={idx} className={`border-b border-primary/10 ${idx % 2 === 0 ? "bg-white" : "bg-primary/5"}`}>
                  <td className="py-3 px-4">{item.name}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="p-6 bg-gradient-to-r from-primary to-emerald-500 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Total Amount</span>
            <span className="text-3xl font-bold">{data.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

