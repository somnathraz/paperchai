"use client";

import { TemplateProps } from "./types";

/**
 * Invoice Compact – V3 (Premium Upgrade)
 * Improvements:
 * - Better left sidebar width + typography
 * - Clean A4-like modal layout
 * - Proper spacing + breathing room
 * - Subtle zebra striping for table
 * - Strong, bold total section
 * - Stripe-inspired right content layout
 */

export function InvoiceCompact({ preview = false, modalPreview = false, mockData }: TemplateProps) {
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

  /* ============================
     THUMBNAIL PREVIEW (Small)
     ============================ */
  if (preview && !modalPreview) {
    return (
      <div className="h-[150px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 tracking-wider">
          <span>Invoice</span>
          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-[2px] text-[10px] font-semibold">
            Free
          </span>
        </div>

        <div className="flex gap-3 mt-3">
          <div className="w-1/3 space-y-2">
            <div className="h-2 w-4/5 bg-slate-300 rounded" />
            <div className="h-2 w-3/5 bg-slate-300 rounded" />
          </div>

          <div className="flex-1 rounded-lg border border-dashed border-slate-300 p-2 space-y-1.5">
            <div className="h-2 bg-slate-200 w-full rounded" />
            <div className="h-2 bg-slate-200 w-3/5 rounded" />
          </div>
        </div>

        <div className="text-right text-xs font-semibold text-emerald-700 mt-3">
          {data.total}
        </div>
      </div>
    );
  }

  /* ============================
     FULL MODAL PREVIEW
     ============================ */
  if (modalPreview) {
    return (
      <div
        className="h-full w-full bg-white text-[#111] flex"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* LEFT SIDEBAR */}
        <div className="w-[260px] border-r border-slate-200 px-10 py-12 space-y-10 bg-slate-50/60">
          {/* Business Info */}
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight mb-1">
              {data.businessName}
            </h1>
            <p className="text-[13px] text-slate-600">#{data.invoiceNumber}</p>
            <p className="text-[13px] text-slate-600 mt-1">
              {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Bill To */}
          <div>
            <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-1">
              Bill To
            </p>
            <p className="text-[15px] leading-relaxed text-slate-900 font-medium">
              {data.clientName}
            </p>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 px-12 py-12 flex flex-col">
          <h2 className="text-[26px] font-semibold tracking-tight mb-10">
            INVOICE
          </h2>

          {/* ITEMS TABLE */}
          <div className="flex-1 mb-10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-4 text-[12px] font-semibold uppercase text-slate-600 tracking-wider">
                    Description
                  </th>
                  <th className="text-right py-4 text-[12px] font-semibold uppercase text-slate-600 tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.items?.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-200 ${idx % 2 === 0 ? "bg-slate-50/40" : "bg-white"}`}
                  >
                    <td className="py-4 text-[15px] text-slate-800">
                      {item.name}
                    </td>
                    <td className="py-4 text-right text-[15px] font-medium text-slate-900">
                      {item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end mb-6">
            <div className="w-64 text-right space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>₹22,600</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span>₹2,000</span>
              </div>
              <div className="pt-4 border-t-2 border-emerald-600 flex justify-between text-[20px] font-bold text-emerald-700">
                <span>Total</span>
                <span>{data.total}</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-slate-300 pt-6">
            <p className="text-[13px] text-slate-600 text-center">
              Payment due in <span className="font-semibold">30 days</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================
     FULL EDITOR VIEW
     ============================ */
  return (
    <div className="min-h-screen bg-white p-8 text-[#222]">
      <div className="max-w-5xl mx-auto flex gap-10">
        {/* LEFT COLUMN */}
        <div className="w-[260px] border-r border-slate-200 pr-8 space-y-6 bg-slate-50/60 py-8">
          <div>
            <h1 className="text-xl font-bold">{data.businessName}</h1>
            <p className="text-xs text-slate-500">#{data.invoiceNumber}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Bill To:</p>
            <p className="text-sm font-medium">{data.clientName}</p>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-6">INVOICE</h2>

          {/* ITEMS TABLE */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-600">
                  Description
                </th>
                <th className="text-right py-2 text-xs font-semibold text-slate-600">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {data.items?.map((item, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-slate-50/40" : ""}`}
                >
                  <td className="py-3 text-sm">{item.name}</td>
                  <td className="py-3 text-sm text-right font-medium">
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="mt-6 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-slate-600">Subtotal: ₹22,600</p>
              <p className="text-sm text-slate-600">Tax: ₹2,000</p>
              <p className="text-xl font-bold mt-2 text-emerald-600">
                Total: {data.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
