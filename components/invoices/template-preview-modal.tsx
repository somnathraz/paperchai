"use client";

import { useState } from "react";
import {
  X,
  Play,
  MonitorSmartphone,
  TabletSmartphone,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { renderTemplate } from "./templates/registry";

type PreviewView = "a4" | "mobile" | "full";
type ZoomLevel = 90 | 100 | 120;

const mockPreviewData = {
  businessName: "PaperChai Studio",
  invoiceNumber: "INV-2024-001",
  clientName: "Nova Labs",
  total: "₹24,600",
  subtotal: "₹22,600",
  tax: "₹2,000",
  items: [
    { name: "Homepage redesign", amount: "₹18,200" },
    { name: "Copy polish", amount: "₹6,400" },
  ],
  notes: "Thank you for your business!",
  paymentTerms: "Net 30 days",
};

function renderPreview(
  template: TemplatePreviewModalProps["template"],
  view: PreviewView,
  zoom: ZoomLevel,
  darkToggle: boolean
) {
  /** A4 FRAME - True PDF dimensions (794px at 96dpi) */
  if (view === "a4") {
    return (
      <div className="flex w-full justify-center items-center p-8 bg-neutral-100 min-h-full">
        <div 
          className="bg-white overflow-hidden"
          style={{ 
            width: `${794 * (zoom / 100)}px`,
            height: `${1123 * (zoom / 100)}px`, // A4 height at 96dpi
            maxWidth: "100%",
            maxHeight: "100%"
          }}
        >
          {renderTemplate(template.slug, {
            preview: true,
            modalPreview: true,
            mockData: mockPreviewData,
            previewDark: darkToggle,
            sections: [
              { id: "header", title: "Header", visible: true },
              { id: "bill_to", title: "Bill To", visible: true },
              { id: "items", title: "Items", visible: true },
              { id: "summary", title: "Summary", visible: true },
              { id: "notes", title: "Notes", visible: true },
              { id: "payment", title: "Payment", visible: true },
              { id: "custom_demo", title: "Signature", visible: true, custom: true, content: "Authorized signatory" },
            ],
          })}
        </div>
      </div>
    );
  }

  /** MOBILE FRAME - 360px width */
  if (view === "mobile") {
    return (
      <div className="flex w-full justify-center items-center py-6 bg-neutral-100 min-h-full">
        <div 
          className="bg-white overflow-hidden"
          style={{ 
            width: `${360 * (zoom / 100)}px`,
            maxWidth: "100%"
          }}
        >
          {renderTemplate(template.slug, {
            preview: true,
            modalPreview: true,
            mockData: mockPreviewData,
            previewDark: darkToggle,
          })}
        </div>
      </div>
    );
  }

  /** FULL BLEED VIEW */
  return (
    <div className="flex w-full justify-center items-center py-4 bg-neutral-100 min-h-full">
      <div 
        className="bg-white overflow-hidden w-full"
        style={{ 
          maxWidth: "1200px",
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top center"
        }}
      >
        {renderTemplate(template.slug, {
          preview: true,
          modalPreview: true,
          mockData: mockPreviewData,
          previewDark: darkToggle,
        })}
      </div>
    </div>
  );
}

type TemplatePreviewModalProps = {
  template: {
    slug: string;
    name: string;
    isPro: boolean;
    accent?: string | null;
    tags?: string | null;
    category?: string | null;
  };
  onClose: () => void;
};

export function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps) {
  const tag = template.isPro ? "Pro" : "Free";
  const [view, setView] = useState<PreviewView>("a4");
   const [zoom, setZoom] = useState<ZoomLevel>(100);
  const isDarkDefault = (template.tags || "").toLowerCase().includes("dark");
  const [darkToggle, setDarkToggle] = useState<boolean>(isDarkDefault);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-[8px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* FLOATING CLOSE BUTTON */}
      <button
        type="button"
        className="absolute right-6 top-6 z-[10000] rounded-full bg-white/95 p-3 shadow-lg hover:bg-white transition"
        onClick={onClose}
      >
        <X className="h-5 w-5 text-slate-700" />
      </button>

      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.35)] p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Template Preview
            </p>
            <h2 className="text-xl font-semibold text-foreground">
              {template.name}
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tag === "Pro" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {tag}
          </span>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/60">
          {/* VIEW BUTTONS */}
          {[
            { key: "a4", label: "A4", icon: FileText },
            { key: "mobile", label: "Mobile", icon: TabletSmartphone },
            { key: "full", label: "Full", icon: MonitorSmartphone },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key as PreviewView)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                view === v.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border"
              }`}
            >
              <v.icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          ))}

          {/* DARK MODE TOGGLE */}
          {isDarkDefault && (
            <button
              type="button"
              onClick={() => setDarkToggle((v) => !v)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              {darkToggle ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkToggle ? "Light" : "Dark"}
            </button>
          )}

          {/* ZOOM */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Zoom</span>
            {[90, 100, 120].map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z as ZoomLevel)}
                className={`rounded px-1.5 py-0.5 text-xs font-medium transition ${
                  zoom === z ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {z}%
              </button>
            ))}
          </div>
        </div>

        {/* PREVIEW AREA - No nested boxes, direct invoice rendering */}
        <div className="flex-1 overflow-auto bg-neutral-100">
          {renderPreview(template, view, zoom, darkToggle)}
        </div>

        {/* FOOTER */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/60">
          <span className="text-xs text-muted-foreground">
            {tag === "Pro" ? "Included in Pro · ₹149/mo" : "Free template"}
          </span>
          <a
            href={`/invoices/new?template=${template.slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] transition"
          >
            Use template
            <Play className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
