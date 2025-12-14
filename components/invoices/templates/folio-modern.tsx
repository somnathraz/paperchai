"use client";

import { TemplateProps } from "./types";

/**
 * Folio Modern — V2 (Upgraded Editorial Magazine Style)
 * Improvements:
 * - Better vertical rhythm
 * - Left margin strengthened with ruler-line feel
 * - Stronger section titles (magazine layout)
 * - Soft rose tint with neutral blacks
 * - Better spacing between items
 * - More premium total block with grid alignment
 */

export function FolioModern({
  preview = false,
  modalPreview = false,
  mockData,
}: TemplateProps) {
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

  /* ===============================
      1. Thumbnail Preview
     =============================== */
  if (preview && !modalPreview) {
    return (
      <div className="h-[150px] rounded-xl overflow-hidden border bg-white shadow-md p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600">
          <span>Invoice</span>
          <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-[2px] text-[10px] font-semibold">
            Pro
          </span>
        </div>

        <div className="mt-3 flex gap-4">
          <div className="w-10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-1/3 bg-rose-200 rounded"></div>
            <div className="h-2 w-full bg-slate-200 rounded"></div>
            <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
          </div>
          <div className="w-16 text-right">
            <div className="h-6 w-full bg-rose-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  /* ===============================
      2. Full Modal Preview
     ================================ */
  if (modalPreview) {
    return (
      <div
        className="h-full w-full bg-white text-black flex flex-col"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="flex gap-16 px-16 pt-16 pb-10">
          {/* Left Editorial Margin */}
          <div className="w-32 flex-shrink-0 border-r pr-6 border-rose-100">
            <h1 className="text-[46px] font-light leading-none text-rose-600 tracking-tight">
              INVOICE
            </h1>
            <p className="text-[12px] text-[#666] mt-6 uppercase tracking-[0.22em]">
              #{data.invoiceNumber}
            </p>
          </div>

          {/* Right Content */}
          <div className="flex-1 space-y-12">
            {/* From */}
            <div>
              <p className="text-[12px] uppercase tracking-[0.30em] text-[#666] mb-1">
                From
              </p>
              <h2 className="text-[22px] font-light">{data.businessName}</h2>
            </div>

            {/* To */}
            <div>
              <p className="text-[12px] uppercase tracking-[0.30em] text-[#666] mb-1">
                To
              </p>
              <p className="text-[18px] font-light leading-relaxed">
                {data.clientName}
              </p>
            </div>

            {/* Items */}
            <div className="space-y-10">
              {data.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start border-b pb-6 border-rose-200"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[#888] mb-1">
                      Item {idx + 1}
                    </p>
                    <p className="text-[17px] font-light">{item.name}</p>
                  </div>
                  <p className="text-[17px] font-light">{item.amount}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end border-t pt-8 border-rose-200">
              <div className="text-right">
                <p className="text-[12px] uppercase tracking-[0.30em] text-[#666] mb-2">
                  Total
                </p>
                <p className="text-[52px] font-light leading-none text-rose-600">
                  {data.total}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===============================
      3. Full Editor View (Page)
     ================================ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white p-16 text-black">
      <div className="max-w-6xl mx-auto flex gap-20">
        {/* Left Margin */}
        <div className="w-40 border-r border-rose-200 pr-8">
          <h1 className="text-6xl text-rose-600 font-light tracking-tight">
            INVOICE
          </h1>
          <p className="text-xs text-slate-600 mt-4 uppercase tracking-widest">
            #{data.invoiceNumber}
          </p>
        </div>

        {/* Main */}
        <div className="flex-1 space-y-16">
          {/* From */}
          <div>
            <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest">
              From
            </p>
            <h2 className="text-2xl font-light">{data.businessName}</h2>
          </div>

          {/* To */}
          <div>
            <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest">
              To
            </p>
            <p className="text-xl font-light">{data.clientName}</p>
          </div>

          {/* Items */}
          <div className="space-y-12">
            {data.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-start border-b pb-6 border-rose-200"
              >
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                    Item {idx + 1}
                  </p>
                  <p className="text-lg font-light">{item.name}</p>
                </div>
                <p className="text-lg font-light">{item.amount}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end pt-10 border-t border-rose-200">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
                Total
              </p>
              <p className="text-5xl font-light text-rose-600">
                {data.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
