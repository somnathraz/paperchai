"use client";

import { TemplateProps } from "./types";

/**
 * Studio Bold - Big bold headings, creative studio feel
 * Layout: Left: Big "INVOICE" text | Right: Business details
 *         Mid: Client block | Items | Totals | Footer message
 */
export function StudioBold({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>
          <div className="mt-3 flex gap-3">
            <div className="w-1/3">
              <div className="h-8 w-full rounded-lg bg-yellow-200" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-300" />
              <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-800">
            <span>Total</span>
            <span>{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white text-black flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Section 1: Header - Big "INVOICE" Left, Business Right */}
        <div className="flex items-start justify-between px-12 pt-12 pb-8 border-b-4 border-yellow-400">
          <h1 className="text-[56px] font-black text-yellow-400 leading-none tracking-tight">INVOICE</h1>
          <div className="text-right">
            <h2 className="text-[20px] font-semibold mb-2 tracking-tight">{data.businessName}</h2>
            <p className="text-[13px] text-[#666666]">#{data.invoiceNumber}</p>
          </div>
        </div>

        {/* Section 2: Client Block */}
        <div className="px-12 py-8 bg-black text-white">
          <p className="text-[13px] mb-2 text-yellow-400 uppercase tracking-wide">BILL TO:</p>
          <p className="text-[20px] font-semibold leading-relaxed">{data.clientName}</p>
        </div>

        {/* Section 3: Items */}
        <div className="px-12 py-8 flex-1 space-y-4">
          {data.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-4 border-b-2 border-black">
              <span className="text-[16px] font-semibold text-[#111111] leading-relaxed">{item.name}</span>
              <span className="text-[16px] font-semibold text-[#111111]">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Section 4: Total */}
        <div className="px-12 py-8 bg-yellow-400">
          <div className="flex justify-between items-center">
            <span className="text-[22px] font-black text-[#111111]">TOTAL</span>
            <span className="text-[32px] font-black text-[#111111]">{data.total}</span>
          </div>
        </div>

        {/* Section 5: Footer */}
        <div className="px-12 py-6 text-center border-t border-[#EAEAEA] bg-[#F8F9FA]">
          <p className="text-[13px] text-[#666666]">Thank you for your business!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-5xl">
        {/* Header - Big "INVOICE" Left, Business Right */}
        <div className="flex items-start justify-between mb-12 border-b-4 border-yellow-400 pb-6">
          <h1 className="text-7xl font-black text-yellow-400 leading-none">INVOICE</h1>
          <div className="text-right">
            <h2 className="text-2xl font-bold mb-1">{data.businessName}</h2>
            <p className="text-sm text-slate-600">#{data.invoiceNumber}</p>
            <p className="text-sm text-slate-600 mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Client Block */}
        <div className="mb-8 bg-black text-white p-6">
          <p className="text-sm mb-2 text-yellow-400">BILL TO:</p>
          <p className="text-2xl font-bold">{data.clientName}</p>
        </div>

        {/* Items */}
        <div className="mb-8 space-y-4">
          {data.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-4 border-b-2 border-black">
              <span className="text-xl font-bold">{item.name}</span>
              <span className="text-xl font-bold">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mb-8 bg-yellow-400 p-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-black">TOTAL</span>
            <span className="text-4xl font-black">{data.total}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}

