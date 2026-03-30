"use client";

import { TemplateProps } from "./types";
import { getOrderedSections } from "./section-renderer";
import Image from "next/image";

/**
 * Essential Pro - Clean SaaS style (Stripe-like)
 * Layout: Right-aligned totals | Tags for line items | Client contact card
 * Slot order: left: ["bill_to", "notes"], right: ["summary", "payment"], main: ["header", "items"]
 */
export function EssentialPro({ preview = false, modalPreview = false, mockData, sectionVisibility, sections }: TemplateProps) {
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
          <div className="px-12 pt-12 pb-8 border-b border-[#EAEAEA]">
            <h1 className="text-[22px] font-semibold mb-2 tracking-tight">{data.businessName}</h1>
            <div className="flex items-center gap-3 text-[13px] text-[#666666]">
              <span>Invoice #{data.invoiceNumber}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        );
      case "bill_to":
        if (!show("bill_to")) return null;
        return (
          <div className="px-12 py-8 bg-[#F8F9FA] border-b border-[#EAEAEA]">
            <p className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">Bill To</p>
            <p className="text-[16px] text-[#111111] leading-relaxed">{data.clientName}</p>
          </div>
        );
      case "items":
        if (!show("items")) return null;
        return (
          <div className="px-12 py-8 flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAEAEA]">
                  <th className="text-left py-3 text-[12px] font-semibold text-[#666666] uppercase tracking-wide">Description</th>
                  <th className="text-right py-3 text-[12px] font-semibold text-[#666666] uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#EAEAEA]/50">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-[11px] font-medium bg-[#3A7BFF]/10 text-[#3A7BFF] rounded">Service</span>
                        <span className="text-[14px] text-[#111111] leading-relaxed">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right text-[14px] font-medium text-[#111111]">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "summary":
        if (!show("summary")) return null;
        return (
          <div className="px-12 py-8 flex justify-end border-t border-[#EAEAEA]">
            <div className="w-64 space-y-2 text-right">
              {data.subtotal && (
                <div className="flex justify-between text-[13px] text-[#666666]">
                  <span>{data.subtotalLabel || "Subtotal"}</span>
                  <span>{data.subtotal}</span>
                </div>
              )}
              {data.tax && (
                <div className="flex justify-between text-[13px] text-[#666666]">
                  <span>{data.taxLabel || "Tax"}</span>
                  <span>{data.tax}</span>
                </div>
              )}
              {data.discount && (
                <div className="flex justify-between text-[13px] text-[#c2410c]">
                  <span>Discount</span>
                  <span>{data.discount}</span>
                </div>
              )}
              {data.fee && (
                <div className="flex justify-between text-[13px] text-[#666666]">
                  <span>Fees</span>
                  <span>{data.fee}</span>
                </div>
              )}
              {data.extraSummaryLabel && data.extraSummaryValue && (
                <div className="flex justify-between text-[13px] text-[#666666]">
                  <span>{data.extraSummaryLabel}</span>
                  <span>{data.extraSummaryValue}</span>
                </div>
              )}
              <div className="pt-3 border-t-2 border-[#3A7BFF] flex justify-between text-[18px] font-semibold text-[#3A7BFF]">
                <span>{data.totalLabel || "Total"}</span>
                <span>{data.total}</span>
              </div>
            </div>
          </div>
        );
      case "notes":
        if (!show("notes")) return null;
        return (
          <div className="px-12 py-8 bg-[#F8F9FA] border-b border-[#EAEAEA]">
            <p className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">Notes</p>
            <p className="text-[14px] text-[#111111] leading-relaxed whitespace-pre-line">{data.notes}</p>
          </div>
        );
      case "payment":
        if (!show("payment")) return null;
        return (
          <div className="px-12 py-6 border-t border-[#EAEAEA] text-center bg-[#F8F9FA]">
            <p className="text-[13px] text-[#666666]">{data.paymentTerms || "Payment due in 30 days"}</p>
            {data.reminderCadence && (
              <p className="text-[12px] text-[#888888] mt-1">
                Reminders: Soft {data.reminderCadence.softDays ?? "-"}d · Medium {data.reminderCadence.mediumDays ?? "-"}d · Firm {data.reminderCadence.firmDays ?? "-"}d
              </p>
            )}
            {/* Signature */}
            {data.signatureUrl && (
              <div className="mt-12 flex justify-end">
                <div className="text-right">
                  <div className="mb-2 h-16 w-32 relative">
                    <Image
                      src={data.signatureUrl || ""}
                      alt="Signature"
                      width={128}
                      height={64}
                      className="h-full w-full object-contain object-right"
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{data.businessName}</p>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Essential Pro slot map: left: ["bill_to", "notes"], right: ["summary", "payment"], main: ["header", "items"]
  // Get ordered sections - this respects manual ordering but groups by slot
  const orderedSections = getOrderedSections(
    "essential-pro",
    sections,
    ["header", "bill_to", "items", "summary", "notes", "payment"]
  );

  // Separate sections into slots based on template's layout
  // Preserve manual order within each slot
  const leftSlotIds = ["bill_to", "notes"];
  const rightSlotIds = ["summary", "payment"];
  const mainSlotIds = ["header", "items"];

  const mainSections = orderedSections.filter((s) => mainSlotIds.includes(s.id));
  const leftSections = orderedSections.filter((s) => leftSlotIds.includes(s.id));
  const rightSections = orderedSections.filter((s) => rightSlotIds.includes(s.id));

  // Custom sections: place them after the last section of their type
  // For Essential Pro, custom sections go to left column (after notes)
  const customSections = orderedSections.filter((s) => s.custom && s.visible);

  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 to-white p-4 shadow-inner">
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-semibold">Pro</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-2/3 rounded-full bg-slate-300" />
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded bg-blue-100" />
              <div className="h-2 flex-1 rounded-full bg-slate-300" />
            </div>
            <div className="mt-2 flex items-center justify-end text-[11px] font-semibold text-blue-600">
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    return (
      <div className="h-full w-full bg-white text-[#111111] flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Main sections (header, items) */}
        {mainSections.map((section) => {
          if (!section.visible) return null;
          if (section.custom) {
            return (
              <div key={section.id} className="border-t border-[#EAEAEA] px-12 py-6 bg-[#F8F9FA]">
                <h3 className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">{section.title}</h3>
                {section.items && section.items.length > 0 ? (
                  <table className="w-full text-[13px]">
                    <tbody>
                      {section.items.map((row, idx) => (
                        <tr key={idx} className="border-b border-[#EAEAEA]/60">
                          <td className="py-2 pr-4 font-semibold text-[#444444]">{row.label}</td>
                          <td className="py-2 text-right text-[#111111]">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[14px] text-[#111111] leading-relaxed whitespace-pre-line">{section.content}</p>
                )}
              </div>
            );
          }
          return <div key={section.id}>{renderBlock(section.id)}</div>;
        })}

        {/* Two-column layout for left/right sections */}
        {(leftSections.length > 0 || rightSections.length > 0 || customSections.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-[#EAEAEA]">
            {/* Left column */}
            <div className="border-r border-[#EAEAEA]">
              {[...leftSections, ...customSections].map((section) => {
                if (!section.visible) return null;
                if (section.custom) {
                  return (
                    <div key={section.id} className="px-12 py-8 bg-[#F8F9FA] border-b border-[#EAEAEA]">
                      <h3 className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">{section.title}</h3>
                      {section.items && section.items.length > 0 ? (
                        <table className="w-full text-[13px]">
                          <tbody>
                            {section.items.map((row, idx) => (
                              <tr key={idx} className="border-b border-[#EAEAEA]/60">
                                <td className="py-2 pr-4 font-semibold text-[#444444]">{row.label}</td>
                                <td className="py-2 text-right text-[#111111]">{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[14px] text-[#111111] leading-relaxed whitespace-pre-line">{section.content}</p>
                      )}
                    </div>
                  );
                }
                return <div key={section.id}>{renderBlock(section.id)}</div>;
              })}
            </div>

            {/* Right column */}
            <div>
              {rightSections.map((section) => {
                if (!section.visible) return null;
                if (section.custom) {
                  return (
                    <div key={section.id} className="px-12 py-8 border-b border-[#EAEAEA]">
                      <h3 className="text-[13px] font-semibold mb-2 text-[#666666] uppercase tracking-wide">{section.title}</h3>
                      {section.items && section.items.length > 0 ? (
                        <table className="w-full text-[13px]">
                          <tbody>
                            {section.items.map((row, idx) => (
                              <tr key={idx} className="border-b border-[#EAEAEA]/60">
                                <td className="py-2 pr-4 font-semibold text-[#444444]">{row.label}</td>
                                <td className="py-2 text-right text-[#111111]">{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[14px] text-[#111111] leading-relaxed whitespace-pre-line">{section.content}</p>
                      )}
                    </div>
                  );
                }
                return <div key={section.id}>{renderBlock(section.id)}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-3xl font-semibold mb-2">{data.businessName}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>Invoice #{data.invoiceNumber}</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Client Contact Card */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm font-semibold mb-2 text-slate-700">Bill To</p>
          <p className="text-lg">{data.clientName}</p>
        </div>

        {/* Line Items with Tags */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-sm font-semibold text-slate-600">Description</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">Service</span>
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-medium">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right-aligned Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-right">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹22,600</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>₹2,000</span>
            </div>
            <div className="pt-3 border-t-2 border-[#3A7BFF] flex justify-between text-xl font-semibold text-[#3A7BFF]">
              <span>Total</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

