"use client";

import { TemplateProps } from "./types";

/**
 * Duo Card (Upgraded v3)
 * Premium pastel SaaS look • Balanced spacing • Freelancer-first layout
 */
export function DuoCard({ preview = false, modalPreview = false, mockData }: TemplateProps) {
  const data = mockData || {
    businessName: "Your Business",
    invoiceNumber: "INV-2024-001",
    clientName: "Client Name",
    subtotal: "₹22,600",
    tax: "₹2,000",
    discount: "₹0",
    total: "₹24,600",
    items: [
      { name: "Service Item 1", amount: "₹12,000" },
      { name: "Service Item 2", amount: "₹12,600" },
    ],
    notes: "Thank you for your business!",
    paymentTerms: "Payment due in 30 days",
  };

  /* ------------------------ MINI PREVIEW (Card in Gallery) ------------------------ */
  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 to-white p-4 shadow-inner">
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>

          {/* Fake pastel cards */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5 rounded-lg bg-[#EAF3FF] p-2">
              <div className="h-2 w-4/5 rounded-full bg-slate-300"></div>
              <div className="h-2 w-3/5 rounded-full bg-slate-300"></div>
            </div>
            <div className="space-y-1.5 rounded-lg bg-[#FFF3E3] p-2">
              <div className="h-2 w-2/3 rounded-full bg-slate-300"></div>
              <div className="h-2 w-1/2 rounded-full bg-slate-300"></div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-lg bg-[#FFEAEA] p-2 text-[11px] font-semibold text-slate-700">
            <span>Total</span>
            <span>{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------- MODAL PREVIEW (Large) ----------------------------- */
  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white flex flex-col" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* HEADER CARDS */}
        <div className="grid grid-cols-2 gap-6 px-12 pt-12 pb-8">
          {/* FROM */}
          <div className="rounded-xl bg-[#EAF3FF] p-6 border border-blue-200/60 shadow-sm">
            <h3 className="text-[12px] font-semibold text-blue-700 uppercase tracking-wide mb-2">
              From
            </h3>
            <h2 className="text-[18px] font-semibold text-[#111] leading-tight">{data.businessName}</h2>
            <p className="text-[13px] text-blue-600 mt-1">Invoice #{data.invoiceNumber}</p>
          </div>

          {/* TO */}
          <div className="rounded-xl bg-[#FFF3E3] p-6 border border-orange-200/60 shadow-sm">
            <h3 className="text-[12px] font-semibold text-orange-700 uppercase tracking-wide mb-2">
              Bill To
            </h3>
            <p className="text-[16px] font-medium text-[#111]">{data.clientName}</p>
          </div>
        </div>

        {/* INVOICE TITLE */}
        <div className="text-center px-12 py-6 border-b border-slate-200">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#111]">INVOICE</h2>
        </div>

        {/* ITEMS */}
        <div className="px-12 py-8 flex-1">
          <h3 className="text-[13px] font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Items
          </h3>

          <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-4">
            {data.items?.map((item, i) => (
              <div key={i} className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-[14px] text-[#111]">{item.name}</span>
                <span className="text-[14px] font-semibold">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SUMMARY + TOTAL */}
        <div className="px-12 pt-8 pb-6 bg-[#FFEAEA] border-t border-red-200/60">
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{data.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{data.tax}</span>
            </div>
            {data.discount && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>{data.discount}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-red-200/60 mt-4 pt-4">
            <span className="text-[18px] font-semibold text-red-700">Total</span>
            <span className="text-[24px] font-bold text-red-800">{data.total}</span>
          </div>
        </div>

        {/* PAYMENT SECTION */}
        <div className="px-12 py-6 border-t border-slate-200 bg-[#F9FAFB] text-center">
          <p className="text-[13px] text-slate-500">{data.paymentTerms}</p>
        </div>
      </div>
    );
  }

  /* ------------------------------- FULL PAGE VIEW ------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#EAF3FF] p-6 border border-blue-200/60 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-700 mb-1">From</h3>
            <h2 className="text-xl font-bold">{data.businessName}</h2>
            <p className="text-sm text-blue-600 mt-1">#{data.invoiceNumber}</p>
          </div>

          <div className="rounded-2xl bg-[#FFF3E3] p-6 border border-orange-200/60 shadow-sm">
            <h3 className="text-sm font-semibold text-orange-700 mb-1">Bill To</h3>
            <p className="text-lg font-medium">{data.clientName}</p>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200/70 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Items</h3>
          <div className="space-y-3">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-slate-100 pb-2">
                <span>{item.name}</span>
                <span className="font-semibold">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-[#FFEAEA] p-6 border border-red-200/60 shadow-sm">
          <div className="space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{data.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{data.tax}</span>
            </div>
            {data.discount && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>{data.discount}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-red-200/70 pt-4 mt-4">
            <span className="text-lg font-semibold text-red-700">Total</span>
            <span className="text-2xl font-bold text-red-800">{data.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
