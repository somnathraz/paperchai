"use client";

import { TemplateProps } from "./types";

/**
 * Split Hero V4 – Ultra Premium
 * Left = High-end gradient hero panel
 * Right = Clean editorial invoice layout
 */
export function SplitHero({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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

  /* -----------------------------------------
     GALLERY PREVIEW (small preview card) 
  ------------------------------------------*/
  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 via-white to-white shadow-inner p-4">
        <div className="h-full rounded-xl border border-white/40 bg-white/90 p-4 shadow-md">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">Pro</span>
          </div>

          <div className="flex gap-3 h-full">
            {/* Mini hero preview */}
            <div className="w-2/5 rounded-lg bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 shadow-inner" />

            {/* Minimal invoice preview */}
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-4/5 rounded-full bg-slate-300" />
              <div className="h-2 w-3/5 rounded-full bg-slate-300" />
              <div className="h-2 w-1/2 rounded-full bg-slate-300" />

              <div className="pt-2 flex justify-between text-[11px] font-semibold text-slate-700">
                <span>Total</span>
                <span>{data.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------------------
     MODAL PREVIEW – SHOWN IN POPUP 
  ------------------------------------------*/
  if (modalPreview) {
    return (
      <div
        className="h-full w-full bg-white flex"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* LEFT HERO PANEL */}
        <div className="w-1/2 relative flex items-center justify-center 
                        bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900
                        text-white overflow-hidden">

          {/* Vignette */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          <div className="relative text-center px-12">
            {/* Polished logo mask */}
            <div className="h-28 w-28 mx-auto mb-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl" />

            <h1 className="text-[26px] font-semibold tracking-tight text-white">
              {data.businessName}
            </h1>
            <p className="text-white/80 mt-2 text-[14px]">Professional Services</p>
          </div>
        </div>

        {/* RIGHT INVOICE PANEL */}
        <div className="w-1/2 px-12 pt-14 pb-16 bg-white flex flex-col">
          <h2 className="text-[26px] font-semibold mb-10 tracking-tight">INVOICE</h2>

          {/* Invoice meta */}
          <div className="mb-8">
            <p className="text-[14px] text-[#666] mb-1">
              Invoice #{data.invoiceNumber}
            </p>
            <p className="text-[14px] text-[#666]">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Client */}
          <div className="mb-10">
            <p className="text-[13px] text-[#666] uppercase tracking-wide mb-2">
              Bill To:
            </p>
            <p className="text-[20px] font-medium text-[#111] leading-relaxed">
              {data.clientName}
            </p>
          </div>

          {/* Items */}
          <div className="flex-1 space-y-5">
            {data.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between py-4 border-b border-slate-200"
              >
                <span className="text-[15px] text-[#333]">{item.name}</span>
                <span className="text-[15px] font-semibold text-[#111]">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-8 mt-10 border-t-2 border-[#111]">
            <div className="flex justify-between items-center">
              <span className="text-[20px] font-semibold text-[#111]">Total</span>
              <span className="text-[28px] font-bold text-[#111]">
                {data.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------------------
     FULL PAGE RENDER 
  ------------------------------------------*/
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left hero */}
      <div className="w-1/2 relative flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative text-center p-12">
          <div className="h-32 w-32 mx-auto rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl mb-6" />
          <h1 className="text-4xl font-semibold text-white">
            {data.businessName}
          </h1>
          <p className="text-white/70 mt-2">Professional Services</p>
        </div>
      </div>

      {/* Right invoice */}
      <div className="w-1/2 p-12 bg-white">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold mb-10">INVOICE</h2>

          <p className="text-sm text-slate-500 mb-1">
            Invoice #{data.invoiceNumber}
          </p>
          <p className="text-sm text-slate-500 mb-8">
            {new Date().toLocaleDateString()}
          </p>

          <p className="text-sm text-slate-500 mb-2">Bill To:</p>
          <p className="text-xl font-semibold mb-10">{data.clientName}</p>

          <div className="space-y-6 mb-12">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between pb-4 border-b border-slate-200">
                <span>{item.name}</span>
                <span className="font-semibold">{item.amount}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t-2 border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">Total</span>
              <span className="text-3xl font-bold">{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
