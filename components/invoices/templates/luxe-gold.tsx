"use client";

import { TemplateProps } from "./types";

/**
 * Luxe Gold - V4 Ultra Premium Edition
 * - Rich gold (#D4AF37) with soft gradients
 * - Center-aligned luxury layout
 * - Modern spacing + fashion-magazine typography
 */
export function LuxeGold({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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

  /* -----------------------------------------------------
   * 1) TEMPLATE GRID PREVIEW (CATEGORY CARD)
   * ----------------------------------------------------- */
  if (preview && !modalPreview) {
    return (
      <div className="h-[150px] rounded-xl overflow-hidden border border-amber-300/30 bg-gradient-to-b from-white to-amber-50 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
        <div className="h-full p-4 flex flex-col">
          <div className="h-3 w-full rounded-t-lg bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37]" />

          <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-[0.2em] text-[#8a6d2f]">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">
              Pro
            </span>
          </div>

          <div className="flex-1 mt-3 text-center space-y-2">
            <div className="h-2 w-1/2 mx-auto rounded-full bg-neutral-300/70" />
            <div className="h-2 w-1/3 mx-auto rounded-full bg-neutral-300/50" />

            <div className="h-[2px] w-full bg-gradient-to-r from-[#D4AF37] to-[#B8942A] my-2" />

            <div className="text-[12px] font-bold text-[#D4AF37]">
              {data.total}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------
   * 2) MODAL PREVIEW (FULLSCREEN)
   * ----------------------------------------------------- */
  if (modalPreview) {
    return (
      <div
        className="h-full w-full bg-white text-black flex flex-col"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* Gold Header Bar */}
        <div className="h-3 bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37]" />

        <div className="px-16 py-12 flex-1 text-center space-y-10">
          {/* Business Heading */}
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#111]">
              {data.businessName}
            </h1>
            <h2 className="text-[22px] font-semibold text-[#D4AF37] mt-2 tracking-wide">
              INVOICE
            </h2>

            <p className="text-[13px] text-neutral-600 mt-2">
              #{data.invoiceNumber}
            </p>
            <p className="text-[13px] text-neutral-600">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Divider */}
          <div className="h-[3px] w-28 mx-auto bg-gradient-to-r from-[#D4AF37] to-[#B8942A]" />

          {/* Client Section */}
          <div>
            <p className="text-[13px] text-neutral-600 tracking-wide uppercase">
              Bill To
            </p>
            <p className="text-[20px] font-semibold text-[#111] mt-2">
              {data.clientName}
            </p>
          </div>

          {/* Divider */}
          <div className="h-[3px] w-28 mx-auto bg-gradient-to-r from-[#D4AF37] to-[#B8942A]" />

          {/* Items */}
          <div className="space-y-5 max-w-xl mx-auto text-left">
            {data.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-4 border-b border-[#D4AF37]/40"
              >
                <span className="text-[16px] text-[#111]">{item.name}</span>
                <span className="text-[16px] font-semibold text-[#D4AF37]">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-[3px] w-28 mx-auto bg-gradient-to-r from-[#D4AF37] to-[#B8942A]" />

          {/* Total */}
          <div className="pt-4">
            <p className="text-[38px] font-bold text-[#D4AF37] tracking-tight">
              {data.total}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------
   * 3) FULL PAGE VERSION (EDITOR)
   * ----------------------------------------------------- */
  return (
    <div className="min-h-screen bg-white text-black p-12">
      <div className="mx-auto max-w-4xl">
        {/* Top Gold Strip */}
        <div className="h-4 rounded-t-lg bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37] mb-10" />

        <div className="text-center space-y-10">
          {/* Business Header */}
          <div>
            <h1 className="text-4xl font-semibold text-[#111] tracking-tight">
              {data.businessName}
            </h1>
            <h2 className="text-2xl font-semibold text-[#D4AF37] mt-2 tracking-wide">
              INVOICE
            </h2>
            <p className="text-sm text-neutral-600 mt-2">
              #{data.invoiceNumber}
            </p>
            <p className="text-sm text-neutral-600">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Divider */}
          <div className="h-[3px] w-40 mx-auto bg-gradient-to-r from-[#D4AF37] to-[#B8942A]" />

          {/* Client Section */}
          <div>
            <p className="text-sm text-neutral-500 uppercase tracking-wide">
              Bill To
            </p>
            <p className="text-2xl font-semibold mt-2">{data.clientName}</p>
          </div>

          {/* Divider */}
          <div className="h-[3px] w-40 mx-auto bg-gradient-to-r from-[#D4AF37] to-[#B8942A]" />

          {/* Items */}
          <div className="max-w-2xl mx-auto space-y-6">
            {data.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-5 border-b-2 border-[#D4AF37]/50"
              >
                <span className="text-lg">{item.name}</span>
                <span className="text-lg font-semibold text-[#D4AF37]">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          {/* GOLD TOTAL BAR */}
          <div className="mt-10 py-6 bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37] rounded-xl text-white shadow-lg">
            <p className="text-4xl font-bold tracking-tight">{data.total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
