"use client";

import { TemplateProps } from "./types";
import { getOrderedSections } from "./section-renderer";

/**
 * Minimal Light - Ultra minimal, white background, thin lines
 * Layout: Top center: Business name | Below: Invoice title
 *         Client details | Line items | Totals (highlighted) | Footer links
 */
export function MinimalLight({ preview = false, modalPreview = false, mockData, sectionVisibility, sections }: TemplateProps) {
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

  const show = (id: string) => {
    if (!sectionVisibility) return true;
    return sectionVisibility[id] !== false;
  };

  const renderBlock = (id: string) => {
    switch (id) {
      case "header":
        if (!show("header")) return null;
        return (
          <div className="text-center px-12 pt-12 pb-10 border-b border-[#EDEDED]">
            <h1 className="text-[22px] font-light mb-3 tracking-tight">{data.businessName}</h1>
            <h2 className="text-[18px] font-light text-[#666666] mb-2">INVOICE</h2>
            <p className="text-[13px] text-[#666666]">#{data.invoiceNumber}</p>
          </div>
        );
      case "bill_to":
        if (!show("bill_to")) return null;
        return (
          <div className="px-12 py-10">
            <p className="text-[13px] text-[#666666] mb-2 uppercase tracking-wide">Bill To:</p>
            <p className="text-[16px] text-[#121212] leading-relaxed">{data.clientName}</p>
          </div>
        );
      case "items":
        if (!show("items")) return null;
        return (
          <div className="px-12 space-y-4 flex-1">
            {data.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-[#EDEDED] pb-4">
                <span className="text-[14px] text-[#121212] leading-relaxed">{item.name}</span>
                <span className="text-[14px] font-medium text-[#121212]">{item.amount}</span>
              </div>
            ))}
          </div>
        );
      case "summary":
        if (!show("summary")) return null;
        return (
          <div className="px-12 py-8 border-t-2 border-[#121212] flex justify-between">
            <div className="space-y-1 text-left text-[13px] text-[#666666]">
              {data.subtotal && <p>Subtotal: {data.subtotal}</p>}
              {data.tax && <p>Tax: {data.tax}</p>}
              {data.discount && <p className="text-[#c2410c]">Discount: {data.discount}</p>}
              {data.fee && <p>Fees: {data.fee}</p>}
            </div>
            <div className="text-right">
              <span className="text-[18px] font-semibold text-[#121212]">{data.totalLabel || "Total"}</span>
              <p className="text-[18px] font-semibold text-[#121212]">{data.total}</p>
            </div>
          </div>
        );
      case "payment":
        if (!show("payment")) return null;
        return (
          <div className="px-12 py-8 text-center border-t border-[#EDEDED]">
            <p className="text-[13px] text-[#666666]">Contact: hello@yourbusiness.com</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Get ordered sections based on template's slot map
  const orderedSections = getOrderedSections(
    "minimal-light",
    sections,
    ["header", "bill_to", "items", "summary", "payment"]
  );

  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 to-white p-4 shadow-inner">
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-2/3 rounded-full bg-slate-300 mx-auto" />
            <div className="h-2 w-1/2 rounded-full bg-slate-300 mx-auto" />
            <div className="mt-3 space-y-1 rounded-lg border border-dashed border-slate-200 p-2">
              <div className="h-2 w-full rounded-full bg-slate-300" />
              <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Total</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white text-[#121212] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {orderedSections.map((section) => {
          if (!section.visible) return null;
          if (section.custom) {
            return (
              <div key={section.id} className="border-t border-[#EDEDED] px-12 py-6">
                <h3 className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">{section.title}</h3>
                {section.items && section.items.length > 0 ? (
                  <table className="w-full text-[13px]">
                    <tbody>
                      {section.items.map((row, idx) => (
                        <tr key={idx} className="border-b border-[#EDEDED]/60">
                          <td className="py-2 pr-4 font-semibold text-[#444444]">{row.label}</td>
                          <td className="py-2 text-right text-[#121212]">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[14px] text-[#121212] leading-relaxed whitespace-pre-line">{section.content}</p>
                )}
              </div>
            );
          }
          return <div key={section.id}>{renderBlock(section.id)}</div>;
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-12 text-[#121212]">
      <div className="mx-auto max-w-2xl">
        {/* Header - Centered */}
        <div className="text-center mb-12 border-b border-[#EDEDED] pb-8">
          <h1 className="text-3xl font-light mb-2">{data.businessName}</h1>
          <h2 className="text-xl font-light text-[#A8A8A8]">INVOICE</h2>
          <p className="text-sm text-[#A8A8A8] mt-2">#{data.invoiceNumber}</p>
        </div>

        {/* Client */}
        <div className="mb-8">
          <p className="text-sm text-[#A8A8A8] mb-1">Bill To:</p>
          <p className="text-lg">{data.clientName}</p>
        </div>

        {/* Line Items */}
        <div className="space-y-4 mb-8">
          {data.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between border-b border-[#EDEDED] pb-3">
              <span>{item.name}</span>
              <span className="font-medium">{item.amount}</span>
            </div>
          ))}
        </div>

        {/* Total - Highlighted */}
        <div className="border-t-2 border-[#121212] pt-4 flex justify-between text-xl font-semibold">
          <span>Total</span>
          <span>{data.total}</span>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-[#A8A8A8]">
          <p>Contact: hello@yourbusiness.com</p>
        </div>
      </div>
    </div>
  );
}
