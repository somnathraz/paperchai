"use client";

import { TemplateProps } from "./types";

/**
 * Neat Receipt - Looks like a store receipt
 * Layout: Centered Logo | Receipt # | Date | Items | Total (big bold) | Barcode / QR
 */
export function NeatReceipt({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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
            <span>Receipt</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>
          <div className="mt-3 flex flex-col items-center space-y-2">
            <div className="h-12 w-12 rounded-lg border border-dashed border-slate-200 bg-white/60" />
            <div className="h-2 w-3/4 rounded-full bg-slate-300" />
            <div className="h-2 w-1/2 rounded-full bg-slate-300" />
            <div className="mt-2 w-full border-t-2 border-dashed border-slate-300 pt-2 text-center">
              <div className="text-[11px] font-bold text-slate-800">{data.total}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white text-black flex flex-col items-center justify-center px-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="max-w-xs w-full">
          {/* Section 1: Centered Logo */}
          <div className="text-center mb-6">
            <div className="h-14 w-14 mx-auto bg-slate-200 rounded-lg mb-3" />
            <h1 className="text-[18px] font-semibold tracking-tight">{data.businessName}</h1>
          </div>

          {/* Section 2: Receipt Header */}
          <div className="text-center mb-6 border-b-2 border-dashed border-black pb-4">
            <p className="text-[13px] mb-2 uppercase tracking-wide">RECEIPT</p>
            <p className="text-[14px] font-semibold">#{data.invoiceNumber}</p>
            <p className="text-[13px] mt-2 text-[#666666]">{new Date().toLocaleDateString()}</p>
          </div>

          {/* Section 3: Items */}
          <div className="space-y-2 mb-6">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[13px] border-b border-dotted border-black/20 pb-2">
                <span className="text-[#111111] leading-relaxed">{item.name}</span>
                <span className="font-medium text-[#111111]">{item.amount}</span>
              </div>
            ))}
          </div>

          {/* Section 4: Total - Big Bold */}
          <div className="text-center border-t-2 border-black pt-4 mb-6">
            <p className="text-[13px] mb-2 uppercase tracking-wide">TOTAL</p>
            <p className="text-[32px] font-bold leading-none">{data.total}</p>
          </div>

          {/* Section 5: Barcode */}
          <div className="text-center border-t-2 border-dashed border-black pt-4">
            <div className="h-12 w-full bg-black mb-2" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)" }} />
            <p className="text-[11px] text-[#666666]">{data.invoiceNumber}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-sm">
        {/* Centered Logo */}
        <div className="text-center mb-6">
          <div className="h-16 w-16 mx-auto bg-slate-200 rounded-lg mb-2" />
          <h1 className="text-xl font-bold">{data.businessName}</h1>
        </div>

        {/* Receipt Header */}
        <div className="text-center mb-6 border-b-2 border-dashed border-black pb-4">
          <p className="text-xs mb-1">RECEIPT</p>
          <p className="text-sm font-semibold">#{data.invoiceNumber}</p>
          <p className="text-xs mt-1">{new Date().toLocaleDateString()}</p>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-6">
          {data.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b border-dotted border-black/20 pb-1">
              <span>{item.name}</span>
              <span className="font-medium">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Total - Big Bold */}
        <div className="text-center border-t-2 border-black pt-4 mb-6">
          <p className="text-xs mb-1">TOTAL</p>
          <p className="text-4xl font-bold">{data.total}</p>
        </div>

        {/* Barcode */}
        <div className="text-center border-t-2 border-dashed border-black pt-4">
          <div className="h-16 w-full bg-black mb-2" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)" }} />
          <p className="text-xs">{data.invoiceNumber}</p>
        </div>
      </div>
    </div>
  );
}

