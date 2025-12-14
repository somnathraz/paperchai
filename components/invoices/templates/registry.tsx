/**
 * Template Registry - Maps template slugs to their components
 */

import React from "react";
import Image from "next/image";
import { TemplateSlug, TemplateProps } from "./types";
import { ClassicGray } from "./classic-gray";
import { MinimalLight } from "./minimal-light";
import { DuoCard } from "./duo-card";
import { InvoiceCompact } from "./invoice-compact";
import { SoftPastel } from "./soft-pastel";
import { NeatReceipt } from "./neat-receipt";
import { StudioBold } from "./studio-bold";
import { EdgeMinimalPro } from "./edge-minimal-pro";
import { EssentialPro } from "./essential-pro";
import { FolioModern } from "./folio-modern";
import { GradientAura } from "./gradient-aura";
import { LuxeGold } from "./luxe-gold";
import { MultiBrandDynamic } from "./multi-brand-dynamic";
import { NeoDark } from "./neo-dark";
import { SplitHero } from "./split-hero";
import { TemplateSection } from "./types";

export type { TemplateProps, TemplateSlug };

type TemplateComponent = React.ComponentType<TemplateProps>;

const templateMap: Record<TemplateSlug, TemplateComponent> = {
  "classic-gray": ClassicGray,
  "minimal-light": MinimalLight,
  "duo-card": DuoCard,
  "invoice-compact": InvoiceCompact,
  "soft-pastel": SoftPastel,
  "neat-receipt": NeatReceipt,
  "studio-bold": StudioBold,
  "edge-minimal-pro": EdgeMinimalPro,
  "essential-pro": EssentialPro,
  "folio-modern": FolioModern,
  "gradient-aura": GradientAura,
  "luxe-gold": LuxeGold,
  "multi-brand-dynamic": MultiBrandDynamic,
  "neo-dark": NeoDark,
  "split-hero": SplitHero,
};

export function getTemplateComponent(slug: string): TemplateComponent | null {
  return templateMap[slug as TemplateSlug] || null;
}

// Slot maps per template to honor section order/visibility without changing native layouts.
// Slots: "main" (vertical flow), optional "left"/"right" for two-column layouts.
export const templateSlotMap: Partial<
  Record<TemplateSlug, { main?: string[]; left?: string[]; right?: string[] }>
> = {
  "classic-gray": { main: ["header", "bill_to", "summary", "items", "notes", "payment"] },
  "minimal-light": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "duo-card": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "invoice-compact": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "soft-pastel": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "neat-receipt": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "studio-bold": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "edge-minimal-pro": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "essential-pro": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "folio-modern": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "gradient-aura": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "luxe-gold": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "multi-brand-dynamic": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "neo-dark": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
  "split-hero": { main: ["header", "bill_to", "items", "summary", "notes", "payment"] },
};

// Reorder helper retained for classic-gray only
function reorderSectionsForTemplate(
  slug: TemplateSlug,
  sections: TemplateSection[]
): TemplateSection[] {
  const slotOrder = templateSlotMap[slug];
  if (!slotOrder || !sections || sections.length === 0) {
    return sections;
  }
  const order = [
    ...(slotOrder.left || []),
    ...(slotOrder.right || []),
    ...(slotOrder.main || []),
  ];
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const ordered: TemplateSection[] = [];
  const customSections: TemplateSection[] = [];
  for (const id of order) {
    const section = sectionMap.get(id);
    if (section) {
      ordered.push(section);
      sectionMap.delete(id);
    }
  }
  for (const section of sections) {
    if (!ordered.find((s) => s.id === section.id)) {
      if (section.custom) {
        customSections.push(section);
      } else {
        ordered.push(section);
      }
    }
  }
  return [...ordered, ...customSections];
}

export function renderTemplate(slug: string, props: TemplateProps = {}) {
  const Component = getTemplateComponent(slug);
  if (!Component) {
    return <div className="p-8 text-center text-muted-foreground">Template not found: {slug}</div>;
  }

  const visibilityMap =
    props.sectionVisibility ||
    (props.sections
      ? props.sections.reduce<Record<string, boolean>>((acc, curr) => {
        acc[curr.id] = curr.visible;
        return acc;
      }, {})
      : undefined);

  // Normalize mock data according to visibility so all templates react the same
  let normalizedMock = props.mockData;
  if (visibilityMap && props.mockData) {
    normalizedMock = { ...props.mockData };
    if (visibilityMap.header === false) {
      normalizedMock.businessName = "";
      normalizedMock.invoiceNumber = "";
      (normalizedMock as any).logoUrl = "";
    }
    if (visibilityMap.bill_to === false) {
      normalizedMock.clientName = "";
    }
    if (visibilityMap.items === false) {
      normalizedMock.items = [];
      normalizedMock.subtotal = "";
      normalizedMock.tax = "";
      normalizedMock.discount = "";
      normalizedMock.fee = "";
      normalizedMock.total = "";
    }
    if (visibilityMap.summary === false) {
      normalizedMock.subtotal = "";
      normalizedMock.tax = "";
      normalizedMock.discount = "";
      normalizedMock.fee = "";
      normalizedMock.total = "";
      normalizedMock.extraSummaryLabel = "";
      normalizedMock.extraSummaryValue = "";
    }
    if (visibilityMap.notes === false) {
      normalizedMock.notes = "";
    }
    if (visibilityMap.payment === false) {
      normalizedMock.paymentTerms = "";
    }
  }

  // For classic-gray, respect manual order (drag-and-drop). For other templates, use slot-based ordering
  const reorderedSections = props.sections
    ? (slug === "classic-gray"
      ? props.sections // Respect manual order for classic-gray
      : reorderSectionsForTemplate(slug as TemplateSlug, props.sections))
    : props.sections;

  const customSections = reorderedSections?.filter((s) => s.custom && s.visible);

  // Always render the actual template component to preserve unique designs
  // Templates will respect sectionVisibility and sections props internally
  const rendered = <Component {...props} sectionVisibility={visibilityMap} mockData={normalizedMock} sections={reorderedSections} />;

  const supportsNativeSections = (slug as TemplateSlug) === "classic-gray";

  // If this template already handles custom sections (classic-gray), return rendered as-is
  if (supportsNativeSections) return rendered;

  // For previews (gallery/modal) where the template does not natively support sections,
  // render a generic slot-based layout so visibility/order/custom sections are respected.
  if ((props.preview || props.modalPreview) && reorderedSections && reorderedSections.length > 0) {
    return (
      <TemplateSlotRenderer
        slug={slug as TemplateSlug}
        sections={reorderedSections}
        data={normalizedMock || props.mockData || {}}
      />
    );
  }

  // Only append custom sections if they exist
  if (!customSections || customSections.length === 0) return rendered;

  return (
    <div className="h-full w-full bg-white text-[#111111]">
      {rendered}
      <div className="border-t border-slate-200">
        {customSections.map((section) => {
          if (section.customType === "signature") {
            const hasSignature = section.content || props.mockData?.signatureUrl;
            return (
              <div key={section.id} className="px-8 py-6 border-b border-slate-200/70">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">{section.title}</h3>
                {hasSignature ? (
                  <div className="flex items-center justify-start gap-3">
                    {props.mockData?.signatureUrl ? (
                      <div className="h-12 w-32 relative">
                        <Image
                          src={props.mockData.signatureUrl}
                          alt="Signature"
                          width={128}
                          height={48}
                          className="h-full w-full object-contain object-left"
                        />
                      </div>
                    ) : null}
                    {section.content && <p className="text-sm text-slate-900 whitespace-pre-line">{section.content}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No signature provided.</p>
                )}
              </div>
            );
          }

          if (section.items && section.items.length > 0) {
            return (
              <div key={section.id} className="px-8 py-6 border-b border-slate-200/70">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">{section.title}</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {section.items.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200/60">
                        <td className="py-2 pr-4 font-semibold text-slate-700">{row.label}</td>
                        <td className="py-2 text-right text-slate-900">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return (
            <div key={section.id} className="px-8 py-6 border-b border-slate-200/70">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">{section.title}</h3>
              <p className="text-sm text-slate-900 whitespace-pre-line">{section.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { templateMap };

function TemplateSlotRenderer({
  slug,
  sections,
  data,
}: {
  slug: TemplateSlug;
  sections: TemplateSection[];
  data: any;
}) {
  const ordered = sections.filter((s) => s.visible !== false);
  if (ordered.length === 0) return null;

  const slotOrder =
    templateSlotMap[slug] || { main: ["header", "bill_to", "items", "summary", "notes", "payment"] };

  // Density Config
  const density = data.layoutDensity || "cozy";
  const spacingMatches = {
    compact: { px: "px-6", py: "py-3", header: "pt-6 pb-4", gap: "mb-2", text: "text-sm", title: "text-base" },
    cozy: { px: "px-8", py: "py-5", header: "pt-8 pb-6", gap: "mb-3", text: "text-sm", title: "text-lg" },
    statement: { px: "px-12", py: "py-8", header: "pt-12 pb-8", gap: "mb-4", text: "text-base", title: "text-xl" },
  };
  const s = spacingMatches[density as keyof typeof spacingMatches] || spacingMatches.cozy;

  const renderCore = (id: string) => {
    switch (id) {
      case "header":
        return (
          <div className={`flex items-start justify-between border-b border-slate-200 ${s.px} ${s.header}`}>
            <div>
              {data.logoUrl ? (
                <div className={`${s.gap} h-10 w-10 relative`}>
                  <Image
                    src={data.logoUrl}
                    alt="Logo"
                    fill
                    className="rounded object-contain"
                  />
                </div>
              ) : (
                <div className={`${s.gap} h-10 w-10 rounded bg-slate-300`} />
              )}
              <h1 className={`${s.title} font-semibold leading-tight`}>{data.businessName || "Your Business"}</h1>
            </div>
            <div className="text-right">
              <h2 className={`mb-2 ${s.title} font-semibold tracking-tight`}>INVOICE</h2>
              <p className={`${s.text} text-slate-500`}>#{data.invoiceNumber || "INV-XXXX"}</p>
            </div>
          </div>
        );
      case "bill_to":
        return (
          <div className={`border-b border-slate-200 ${s.px} ${s.py}`}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Bill To:</h3>
            <p className={`${s.text} font-medium text-slate-900 leading-relaxed`}>{data.clientName || "Client"}</p>
          </div>
        );
      case "items":
        return (
          <div className={`${s.px} ${s.py}`}>
            <table className={`w-full ${s.text}`}>
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                  <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className={`py-3 text-slate-900`}>{item.name}</td>
                    <td className={`py-3 text-right font-medium text-slate-900`}>{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "summary":
        return (
          <div className={`border-t border-slate-200 ${s.px} ${s.py} text-right ${s.text}`}>
            {data.subtotal && <p className="text-slate-600">{data.subtotalLabel || "Subtotal"}: {data.subtotal}</p>}
            {data.tax && <p className="text-slate-600">{data.taxLabel || "Tax"}: {data.tax}</p>}
            {data.discount && <p className="text-amber-700">Discount: {data.discount}</p>}
            {data.fee && <p className="text-slate-800">Fees: {data.fee}</p>}
            {data.extraSummaryLabel && data.extraSummaryValue && (
              <p className="text-slate-600">{data.extraSummaryLabel}: {data.extraSummaryValue}</p>
            )}
            <p className="mt-1 text-base font-semibold text-slate-900">{data.totalLabel || "Total"}: {data.total}</p>
          </div>
        );
      case "notes":
        return (
          <div className={`border-t border-slate-200 ${s.px} ${s.py}`}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</h3>
            <p className={`${s.text} text-slate-900 whitespace-pre-line`}>{data.notes}</p>
          </div>
        );
      case "payment":
        return (
          <div className={`border-t border-slate-200 bg-slate-50 ${s.px} ${s.py} text-center ${s.text} text-slate-700`}>
            Payment terms: {data.paymentTerms || "Net 30"}
            {data.reminderCadence && (
              <div className="mt-1 text-xs text-slate-600">
                Reminders: Soft {data.reminderCadence.softDays ?? "-"}d · Medium {data.reminderCadence.mediumDays ?? "-"}d · Firm {data.reminderCadence.firmDays ?? "-"}d
              </div>
            )}
            {data.signatureUrl && (
              <div className="mt-2 flex justify-center">
                <div className="h-12 w-32 relative">
                  <Image
                    src={data.signatureUrl}
                    alt="Signature"
                    fill
                    className="object-contain"
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

  const renderBlock = (section: TemplateSection) => {
    if (section.custom) {
      if (section.customType === "signature") {
        const hasSignature = section.content || data.signatureUrl;
        return (
          <div key={section.id} className={`border-t border-slate-200 ${s.px} ${s.py}`}>
            <h3 className="mb-2 text-sm font-semibold text-slate-600">{section.title}</h3>
            {hasSignature ? (
              <div className="flex items-center gap-3">
                {data.signatureUrl ? (
                  <div className="h-12 w-32 relative">
                    <Image
                      src={data.signatureUrl}
                      alt="Signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : null}
                {section.content && <p className={`${s.text} text-slate-900 whitespace-pre-line`}>{section.content}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No signature provided.</p>
            )}
          </div>
        );
      }
      if (section.customType === "keyValue" && section.items?.length) {
        return (
          <div key={section.id} className={`border-t border-slate-200 ${s.px} ${s.py}`}>
            <h3 className="mb-2 text-sm font-semibold text-slate-600">{section.title}</h3>
            <table className={`w-full ${s.text}`}>
              <tbody>
                {section.items.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-200/70">
                    <td className="py-2 pr-4 font-semibold text-slate-700">{row.label}</td>
                    <td className="py-2 text-right text-slate-900">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div key={section.id} className={`border-t border-slate-200 ${s.px} ${s.py}`}>
          <h3 className="mb-2 text-sm font-semibold text-slate-600">{section.title}</h3>
          <p className={`${s.text} text-slate-900 whitespace-pre-line`}>{section.content}</p>
        </div>
      );
    }
    return <div key={section.id}>{renderCore(section.id)}</div>;
  };

  // Map sections to slots
  const leftSections = ordered.filter((s) => slotOrder.left?.includes(s.id));
  const rightSections = ordered.filter((s) => slotOrder.right?.includes(s.id));
  const mainSections = ordered.filter(
    (s) => slotOrder.main?.includes(s.id) || (!slotOrder.left?.includes(s.id) && !slotOrder.right?.includes(s.id))
  );

  // For non-two-column templates, render main only
  const isTwoColumn = (slotOrder.left?.length || slotOrder.right?.length) ?? 0;

  return (
    <div className="h-full w-full bg-white text-slate-900">
      {isTwoColumn ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
          <div className="border-r border-slate-200">{leftSections.map(renderBlock)}</div>
          <div>{rightSections.map(renderBlock)}</div>
          <div className="lg:col-span-2">{mainSections.map(renderBlock)}</div>
        </div>
      ) : (
        <div>{mainSections.map(renderBlock)}</div>
      )}
    </div>
  );
}
