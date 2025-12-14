"use client";

import { TemplateProps } from "./types";

/**
 * EDGE MINIMAL PRO — V3
 * Premium dark mode corporate invoice with glass sidebar, balanced spacing,
 * improved table, stronger contrast, and polished typography.
 */

export function EdgeMinimalPro({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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

  /* -----------------------
     SMALL CARD PREVIEW
  ------------------------ */
  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/20 bg-[#0D1524] p-4 shadow-lg">
        <div className="h-full rounded-xl bg-white/5 p-4 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/60">
            <span>Invoice</span>
            <span className="rounded-full bg-cyan-100 text-cyan-700 px-2 py-1 text-[10px] font-semibold">
              Pro
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full bg-white/20" />
            <div className="h-2 w-1/2 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------
     MODAL PREVIEW FULL
  ------------------------ */
  if (modalPreview) {
    return (
      <div className="h-full w-full bg-[#0D1524] text-white flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* HEADER */}
        <div className="px-16 py-10 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h1 className="text-[22px] font-light tracking-wide">{data.businessName}</h1>
            <div className="text-right">
              <h2 className="text-[20px] font-light">INVOICE</h2>
              <p className="text-[13px] text-white/50 mt-1">#{data.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* FROM / TO */}
        <div className="grid grid-cols-2 gap-12 px-16 py-12 border-b border-white/10">
          <div>
            <p className="text-[12px] uppercase text-white/50 tracking-wide mb-2">From</p>
            <p className="text-[16px]">{data.businessName}</p>
          </div>
          <div>
            <p className="text-[12px] uppercase text-white/50 tracking-wide mb-2">To</p>
            <p className="text-[16px]">{data.clientName}</p>
          </div>
        </div>

        {/* TABLE + SIDEBAR */}
        <div className="grid grid-cols-[1fr_300px] gap-12 px-16 py-12 flex-1">
          {/* TABLE */}
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 text-[12px] uppercase tracking-wide text-white/50">Description</th>
                  <th className="text-right py-4 text-[12px] uppercase tracking-wide text-white/50">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/10 ${
                      idx % 2 === 0 ? "bg-white/5" : "bg-transparent"
                    }`}
                  >
                    <td className="py-5 text-[15px]">{item.name}</td>
                    <td className="py-5 text-right text-[15px]">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SIDEBAR */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-xl backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <p className="text-[12px] uppercase text-white/50 tracking-wider mb-4">Summary</p>
            <div className="space-y-4">
              <div className="flex justify-between text-[14px]">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white">₹22,600</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-white/60">Tax</span>
                <span className="text-white">₹2,000</span>
              </div>

              <div className="border-t border-white/20 pt-4 flex justify-between">
                <span className="text-[18px] tracking-wide">Total</span>
                <span className="text-[22px] font-semibold text-cyan-300">{data.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 px-16 py-8 text-center bg-white/5">
          <p className="text-[13px] text-white/60">Payment terms: Net 30 days</p>
        </div>
      </div>
    );
  }

  /* -----------------------
     FULL PAGE RENDER
  ------------------------ */
  return (
    <div className="min-h-screen bg-[#0D1524] text-white p-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* HEADER */}
        <div className="px-12 py-10 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-light tracking-wide">{data.businessName}</h1>
            <div className="text-right">
              <h2 className="text-xl font-light">INVOICE</h2>
              <p className="text-sm text-white/50 mt-1">#{data.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* FROM / TO */}
        <div className="grid grid-cols-2 gap-12 px-12 py-12 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <p className="text-xs text-white/50 mb-2 uppercase">From</p>
            <p className="text-lg">{data.businessName}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-2 uppercase">To</p>
            <p className="text-lg">{data.clientName}</p>
          </div>
        </div>

        {/* TABLE + SIDEBAR */}
        <div className="grid grid-cols-[1fr_320px] gap-12">
          {/* TABLE */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 text-xs font-light text-white/60 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right py-4 text-xs font-light text-white/60 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.items?.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/10 ${
                      idx % 2 === 0 ? "bg-white/5" : ""
                    }`}
                  >
                    <td className="py-5">{item.name}</td>
                    <td className="py-5 text-right">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SIDEBAR */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-xl backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <p className="text-xs uppercase text-white/50 mb-4 tracking-wider">
              Summary
            </p>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-white/80">
                <span>Subtotal</span>
                <span>₹22,600</span>
              </div>

              <div className="flex justify-between text-sm text-white/80">
                <span>Tax</span>
                <span>₹2,000</span>
              </div>

              <div className="border-t border-white/20 pt-4 flex justify-between text-lg text-white">
                <span>Total</span>
                <span className="text-cyan-300 font-semibold">{data.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-12 border-t border-white/10 text-center py-6 text-sm text-white/60">
          Payment terms: Net 30 days
        </div>
      </div>
    </div>
  );
}
