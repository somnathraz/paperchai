"use client";

import { TemplateProps } from "./types";
import { getOrderedSections } from "./section-renderer";
import { getFontFamily } from "../font-loader";
import Image from "next/image";

/**
 * Classic Gray - Corporate, neutral gray tones
 * Layout: Header (Left: Logo, Business Name | Right: Invoice Number + Date)
 *         Client Details (Left) | Invoice Summary (Right)
 *         Line Items Table | Notes | Payment Instructions | Footer
 */
export function ClassicGray({ preview = false, modalPreview = false, mockData, sectionVisibility, sections }: TemplateProps) {
  const data = mockData || {
    businessName: "Your Business",
    invoiceNumber: "INV-2024-001",
    clientName: "Client Name",
    total: "₹24,600",
    subtotal: "₹22,600",
    tax: "₹2,000",
    subtotalLabel: "Subtotal",
    taxLabel: "Tax",
    totalLabel: "Total",
    extraSummaryLabel: "",
    extraSummaryValue: "",
    logoUrl: "",
    items: [
      { name: "Service Item 1", amount: "₹12,000" },
      { name: "Service Item 2", amount: "₹12,600" },
    ],
    notes: "Thank you for your business!",
    paymentTerms: "Net 30 days",
  };

  const show = (id: string) => {
    if (!sectionVisibility) return true;
    return sectionVisibility[id] !== false;
  };

  const primary = data.primaryColor || "#111111";
  const accent = data.accentColor || "#111111";
  const bg = data.backgroundColor || "#ffffff";
  const gradientFrom = data.gradientFrom;
  const gradientTo = data.gradientTo;

  const getTypo = (key: string, defaultSize: string, defaultWeight: string) => {
    const s = data.typography?.[key];
    return {
      fontSize: s?.size || defaultSize,
      fontWeight: s?.weight || defaultWeight,
    };
  };

  const renderBlock = (id: string) => {
    switch (id) {
      case "header":
        if (!show("header")) return null;
        return (
          <div className="flex items-start justify-between border-b px-12 pt-12 pb-8" style={{ borderColor: primary + "20" }}>
            <div>
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt="Logo"
                  className="mb-3 object-contain"
                  style={{
                    width: data.logoSettings?.width ? `${data.logoSettings.width}px` : "48px",
                    height: data.logoSettings?.height ? `${data.logoSettings.height}px` : "auto",
                    borderRadius: data.logoSettings?.style === "square" ? "0px" : data.logoSettings?.style === "circle" ? "9999px" : "4px"
                  }}
                />
              ) : (
                <div className="h-12 w-12 rounded mb-3" style={{ backgroundColor: primary + "20" }} />
              )}
              <h1 className="leading-tight" style={{ color: primary, ...getTypo("header", "18px", "600") }}>{data.businessName}</h1>
            </div>
            <div className="text-right">
              <h2 className="text-[22px] font-semibold mb-2 tracking-tight uppercase" style={{ color: accent }}>{data.documentTitle || "INVOICE"}</h2>
              <p className="text-[13px] text-[#666666] font-medium">#{data.invoiceNumber}</p>
              <p className="text-[13px] text-[#666666] mt-1">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        );
      case "bill_to":
        if (!show("bill_to")) return null;
        return (
          <div className="border-b px-12 py-6 flex justify-between items-start" style={{ borderColor: primary + "20" }}>
            <div>
              <h3 className="text-[13px] font-semibold mb-2 uppercase tracking-wide" style={{ color: accent }}>Bill To:</h3>
              <p className="leading-relaxed" style={{ color: primary, ...getTypo("client", "14px", "500") }}>{data.clientName}</p>
              {data.clientCompany && (
                <p className="text-[13px] leading-relaxed" style={{ color: primary + "AA" }}>{data.clientCompany}</p>
              )}
              {data.clientAddress && (
                <p className="text-[13px] leading-relaxed mt-1" style={{ color: primary + "88" }}>{data.clientAddress}</p>
              )}
              {data.clientEmail && (
                <p className="text-[13px] leading-relaxed mt-1" style={{ color: primary + "88" }}>{data.clientEmail}</p>
              )}
              {data.clientPhone && (
                <p className="text-[13px] leading-relaxed" style={{ color: primary + "88" }}>{data.clientPhone}</p>
              )}
            </div>
            {data.projectName && (
              <div className="text-right">
                <p className="text-[13px] font-medium leading-relaxed uppercase tracking-wide mb-1" style={{ color: accent }}>Project</p>
                <p className="font-semibold" style={{ color: primary, ...getTypo("client", "14px", "600") }}>
                  {data.projectName}
                </p>
              </div>
            )}
          </div>
        );
      case "summary":
        if (!show("summary")) return null;
        return (
          <div className="border-b px-12 py-6" style={{ borderColor: primary + "20" }}>
            <div className="text-right space-y-1">
              {data.subtotal && <p className="text-[13px]" style={{ color: primary + "AA" }}>{data.subtotalLabel || "Subtotal"}: {data.subtotal}</p>}
              {data.tax && <p className="text-[13px]" style={{ color: primary + "AA" }}>{data.taxLabel || "Tax"}: {data.tax}</p>}
              {data.discount && <p className="text-[13px] text-[#c2410c]">Discount: {data.discount}</p>}
              {data.fee && <p className="text-[13px]" style={{ color: primary + "AA" }}>Fees: {data.fee}</p>}
              {data.extraSummaryLabel && data.extraSummaryValue && (
                <p className="text-[13px]" style={{ color: primary + "AA" }}>{data.extraSummaryLabel}: {data.extraSummaryValue}</p>
              )}
              <div className="mt-2 pt-2 border-t" style={{ borderColor: primary + "10" }}>
                <p className="" style={{ color: accent, ...getTypo("total", "18px", "700") }}>{data.totalLabel || "Total"}: {data.total}</p>
              </div>
            </div>
          </div>
        );
      case "items":
        if (!show("items")) return null;
        return (
          <div className="px-12 py-8 flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: primary + "30" }}>
                  <th className="text-left py-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: accent }}>Description</th>
                  <th className="text-center py-3 text-[12px] font-semibold uppercase tracking-wide w-16" style={{ color: accent }}>Qty</th>
                  <th className="text-center py-3 text-[12px] font-semibold uppercase tracking-wide w-16" style={{ color: accent }}>Unit</th>
                  <th className="text-right py-3 text-[12px] font-semibold uppercase tracking-wide w-24" style={{ color: accent }}>Rate</th>
                  <th className="text-right py-3 text-[12px] font-semibold uppercase tracking-wide w-24" style={{ color: accent }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b" style={{ borderColor: primary + "15" }}>
                    <td className="py-4" style={{ color: primary }}>
                      <div className="leading-relaxed" style={getTypo("items", "14px", "500")}>{item.name}</div>
                      {item.description && (
                        <div className="text-[12px] mt-1" style={{ color: primary + "88" }}>{item.description}</div>
                      )}
                      {item.hsnCode && (
                        <div className="text-[11px] mt-1" style={{ color: primary + "66" }}>HSN: {item.hsnCode}</div>
                      )}
                    </td>
                    <td className="py-4 text-[14px] text-center" style={{ color: primary }}>{item.qty || item.quantity || 1}</td>
                    <td className="py-4 text-[12px] text-center capitalize" style={{ color: primary + "AA" }}>{item.unit || "nos"}</td>
                    <td className="py-4 text-[14px] text-right" style={{ color: primary }}>{item.rate ? `₹${item.rate.toLocaleString()}` : "-"}</td>
                    <td className="py-4 text-right" style={{ color: primary, ...getTypo("items", "14px", "500") }}>{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "notes":
        if (!show("notes")) return null;
        return (
          <div className="px-12 py-6 border-t" style={{ borderColor: primary + "20" }}>
            <h3 className="text-[13px] font-semibold mb-2 uppercase tracking-wide" style={{ color: primary + "CC" }}>Notes:</h3>
            <p className="leading-relaxed" style={{ color: primary, ...getTypo("footer", "14px", "400") }}>{data.notes}</p>
          </div>
        );
      case "payment":
        if (!show("payment")) return null;
        return (
          <div className="border-t px-12 py-6 space-y-2" style={{ borderColor: primary + "20", backgroundColor: primary + "08" }}>
            <p className="text-center" style={{ color: primary + "AA", ...getTypo("footer", "13px", "400") }}>Payment terms: {data.paymentTerms}</p>
            {data.reminderCadence && (
              <p className="text-[12px] text-center" style={{ color: primary + "88" }}>
                Reminders: Soft {data.reminderCadence.softDays ?? "-"}d · Medium {data.reminderCadence.mediumDays ?? "-"}d · Firm {data.reminderCadence.firmDays ?? "-"}d
              </p>
            )}
            {data.signatureUrl && (
              <div className="flex justify-center pt-2">
                <div className="relative" style={{
                  height: data.signatureSettings?.height ? `${data.signatureSettings.height}px` : "48px",
                  width: "128px", // Provide a default width for the container
                }}>
                  <Image
                    src={data.signatureUrl}
                    alt="Signature"
                    fill // Use fill to make image take up parent div's size
                    className="object-contain"
                    style={{
                      borderRadius: data.signatureSettings?.style === "square" ? "0px" : data.signatureSettings?.style === "rounded" ? "4px" : "0px"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Use sections directly in their provided order (respects manual drag-and-drop reordering)
  // Fallback to default order if no sections provided
  const orderedSections = sections && sections.length > 0
    ? sections
    : getOrderedSections(
      "classic-gray",
      undefined,
      ["header", "bill_to", "summary", "items", "notes", "payment"]
    );

  if (preview && !modalPreview) {
    return (
      <div className="h-[140px] rounded-xl overflow-hidden border border-white/30 bg-gradient-to-b from-slate-50 to-white p-4 shadow-inner">
        <div className="h-full rounded-xl border border-white/40 bg-white/80 shadow-inner p-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span>Invoice</span>
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-semibold">Free</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 rounded-full bg-slate-300" />
              <div className="h-2 w-1/2 rounded-full bg-slate-300" />
            </div>
            <div className="space-y-1.5 rounded-lg border border-dashed border-slate-200 p-2">
              <div className="h-2 w-full rounded-full bg-slate-300" />
              <div className="h-2 w-4/5 rounded-full bg-slate-300" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-[11px] font-semibold text-slate-700">
            <span>Total</span>
            <span>{data.total}</span>
          </div>
        </div>
      </div>
    );
  }

  if (modalPreview) {
    const paperStyle = gradientFrom && gradientTo
      ? { background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo})` }
      : { backgroundColor: bg };
    const fontFamily = getFontFamily(data.fontFamily);
    return (
      <div className="h-full w-full text-[#111111] flex flex-col" style={{ fontFamily, ...paperStyle }}>
        {orderedSections.map((section) => {
          if (!section.visible) return null;
          if (section.custom) {
            return (
              <div key={section.id} className="border-t px-12 py-6" style={{ borderColor: primary + "20" }}>
                <h3 className="text-[13px] font-semibold mb-2 uppercase tracking-wide" style={{ color: primary + "CC" }}>{section.title}</h3>
                {section.items && section.items.length > 0 ? (
                  <table className="w-full text-[13px]">
                    <tbody>
                      {section.items.map((row, idx) => (
                        <tr key={idx} className="border-b" style={{ borderColor: primary + "15" }}>
                          <td className="py-2 pr-4 font-semibold" style={{ color: primary + "AA" }}>{row.label}</td>
                          <td className="py-2 text-right" style={{ color: primary }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: primary }}>{section.content}</p>
                )}
              </div>
            );
          }
          return <div key={section.id}>{renderBlock(section.id)}</div>;
        })}
      </div>
    );
  }

  const fontFamily = getFontFamily(data.fontFamily);
  return (
    <div className="min-h-screen p-8" style={gradientFrom && gradientTo ? { background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo})` } : { backgroundColor: bg }}>
      <div className="mx-auto max-w-4xl bg-white shadow-lg" style={{ fontFamily }}>
        {orderedSections.map((section) => {
          if (!section.visible) return null;
          if (section.custom) {
            return (
              <div key={section.id} className="border-t p-6" style={{ borderColor: primary + "30" }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: primary + "AA" }}>{section.title}</h3>
                {section.items && section.items.length > 0 ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {section.items.map((row, idx) => (
                        <tr key={idx} className="border-b" style={{ borderColor: primary + "20" }}>
                          <td className="py-2 pr-4 font-semibold" style={{ color: primary + "AA" }}>{row.label}</td>
                          <td className="py-2 text-right" style={{ color: primary }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm whitespace-pre-line" style={{ color: primary }}>{section.content}</p>
                )}
              </div>
            );
          }
          return <div key={section.id}>{renderBlock(section.id)}</div>;
        })}
      </div>
    </div>
  );
}
