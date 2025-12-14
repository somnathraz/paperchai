"use client";

import { useMemo, useState, memo } from "react";
import { MonitorSmartphone, Smartphone, FileText, Sparkles } from "lucide-react";
import { ReliabilityCard } from "./reliability-card";
import { AICommandBar } from "./ai-command-bar";
import { InvoiceFormState } from "./invoice-form";
import { renderTemplate } from "./templates/registry";

type InvoicePreviewProps = {
  data: InvoiceFormState;
  templateSlug: string;
  templateTags?: string;
};

type PreviewMode = "a4" | "mobile" | "full";

export const InvoicePreview = memo(function InvoicePreview({ data, templateSlug, templateTags }: InvoicePreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("a4");

  const totals = useMemo(() => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [data.items]);

  const mockData = {
    businessName: "Your Business",
    invoiceNumber: data.number || "INV-XXXX",
    clientName: data.clientId ? "Selected client" : "Client Name",
    total: `₹${totals.total.toLocaleString()}`,
    subtotal: `₹${totals.subtotal.toLocaleString()}`,
    tax: `₹${totals.tax.toLocaleString()}`,
    notes: data.notes,
    paymentTerms: data.terms,
    items: data.items.map((item) => ({
      name: item.title || "Item",
      amount: `₹${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}`,
    })),
  };

  const frame =
    mode === "mobile"
      ? "max-w-[360px]"
      : mode === "full"
        ? "max-w-full"
        : "max-w-[700px]";

  const isDark = (templateTags || "").toLowerCase().includes("dark");

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Live preview</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${mode === "a4" ? "border-primary/50 text-primary" : "border-border/70"
              }`}
            onClick={() => setMode("a4")}
          >
            <FileText className="h-4 w-4" />
            A4
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${mode === "mobile" ? "border-primary/50 text-primary" : "border-border/70"
              }`}
            onClick={() => setMode("mobile")}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${mode === "full" ? "border-primary/50 text-primary" : "border-border/70"
              }`}
            onClick={() => setMode("full")}
          >
            <MonitorSmartphone className="h-4 w-4" />
            Full
          </button>
        </div>
      </div>

      <div className={`flex w-full justify-center rounded-xl bg-slate-50 p-4 shadow-inner`}>
        <div className={`${frame} w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`}>
          <div className="origin-top transition-transform" style={{ transform: "scale(0.85)" }}>
            {renderTemplate(templateSlug, {
              preview: true,
              modalPreview: true,
              mockData,
              previewDark: isDark,
            })}
          </div>
        </div>
      </div>

      <ReliabilityCard />
      <div className="rounded-xl border border-dashed border-border/70 bg-white/80 p-4 text-sm text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Autopilot setup
        </div>
        <p>Payment link and reminders will follow this template automatically.</p>
      </div>
      <AICommandBar />
    </aside>
  );
});

