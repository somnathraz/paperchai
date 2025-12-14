"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SmartSuggestionBar } from "./smart-suggestion-bar";
import { StepsRail } from "./steps-rail";
import { StickyActionBar } from "./sticky-action-bar";
import { InvoiceForm, type InvoiceFormState } from "./invoice-form";
import { InvoicePreview } from "./invoice-preview";

type InvoicesShellProps = {
  firstName: string;
  selectedTemplate?: string;
  selectedTemplateName?: string | null;
  selectedTemplateTags?: string | undefined;
};

const TEMPLATE_LABELS: Record<string, string> = {
  "minimal-light": "Minimal Light",
  "studio-bold": "Studio Bold",
  "gradient-aura": "Gradient Aura",
  "neat-receipt": "Neat Receipt",
  "neo-dark": "Neo Dark",
  "folio-modern": "Folio Modern",
};

const STEPS = [
  "Client",
  "Invoice details",
  "Items & pricing",
  "Taxes & fees",
  "Payment preferences",
  "Notes & terms",
  "Branding",
  "Preview & send",
];

export function InvoicesShell({ firstName, selectedTemplate, selectedTemplateName, selectedTemplateTags }: InvoicesShellProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [clients, setClients] = useState<{ id: string; name: string; email?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; clientId?: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<InvoiceFormState>({
    number: "FMCC-112",
    currency: "INR",
    reminderTone: "Warm + Polite",
    items: [{ title: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
  });

  useEffect(() => {
    const load = async () => {
      const [cRes, pRes] = await Promise.all([fetch("/api/clients/list"), fetch("/api/projects/list")]);
      if (cRes.ok) {
        const data = await cRes.json();
        setClients(data.clients || []);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(data.projects || []);
      }
    };
    load();
  }, []);

  const templateName = selectedTemplateName || TEMPLATE_LABELS[selectedTemplate ?? "minimal-light"] || "Minimal Light";

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formState.clientId,
          projectId: formState.projectId,
          templateSlug: selectedTemplate,
          number: formState.number,
          dueDate: formState.dueDate,
          currency: formState.currency,
          notes: formState.notes,
          terms: formState.terms,
          reminderTone: formState.reminderTone,
          items: formState.items,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-36">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <Link href="/invoices" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:border-primary/40 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Templates
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Template: {templateName}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Autopilot ready</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-primary/40 hover:text-primary">
            Save draft
          </button>
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-primary/40 hover:text-primary">
            Schedule
          </button>
          <button className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-2 text-white shadow-primary/30 transition hover:shadow-primary/50">
            Send invoice
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.26em] text-emerald-100">
            Autopilot ready
            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-100">Live</span>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Invoice autopilot</p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Build it once. PaperChai does the chasing, {firstName}.</h1>
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1">Reliability: 92</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Cadence: Soft in 3 days</span>
              <span className="rounded-full bg-white/10 px-3 py-1">Template: {templateName}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.3em]">Selected template</p>
            <p className="text-lg font-semibold text-white">{templateName}</p>
            <p className="text-xs text-white/60">{selectedTemplateTags}</p>
          </div>
        </div>
      </div>

      <SmartSuggestionBar />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_480px]">
        <StepsRail steps={STEPS} activeStep={activeStep} onStepChange={setActiveStep} />
        <InvoiceForm data={formState} onChange={setFormState} clients={clients} projects={projects} />
        <div className="sticky top-4">
          <InvoicePreview data={formState} templateSlug={selectedTemplate ?? "minimal-light"} templateTags={selectedTemplateTags} />
        </div>
      </div>

      <StickyActionBar variant="dark" onSaveDraft={handleSaveDraft} saving={saving} />
    </div>
  );
}
