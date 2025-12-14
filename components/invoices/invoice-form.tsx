"use client";

import { FileText, Mail, Wallet, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { GripVertical, Plus } from "lucide-react";
import { InvoiceSection } from "./modern-editor/types";

type ClientOption = { id: string; name: string; email?: string | null; reliabilityScore?: number | null };
type ProjectOption = { id: string; name: string; clientId?: string | null };

export type InvoiceItemInput = {
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total?: number;
};

export type InvoiceAdjustment = {
  id: string;
  name: string;
  type: "discount" | "fee";
  mode: "percent" | "fixed";
  value: number;
};

export type InvoiceFormState = {
  clientId?: string;
  projectId?: string;
  businessName?: string;
  logoUrl?: string;
  number: string;
  documentTitle?: string;
  layoutDensity?: "cozy" | "compact" | "statement";
  showBorder?: boolean;
  date?: string; // Issue Date
  dueDate?: string;
  paymentTermOption?: "Immediate" | "Net 7" | "Net 15" | "Net 30" | "Custom";
  currency?: string;
  logoSettings?: { width?: number; height?: number; style?: "rounded" | "square" | "circle" };
  signatureSettings?: { width?: number; height?: number; style?: "rounded" | "square" | "circle" };
  typography?: Record<string, { size?: string; weight?: string }>;
  fontFamily?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  subtotalLabel?: string;
  taxLabel?: string;
  totalLabel?: string;
  extraSummaryLabel?: string;
  extraSummaryValue?: string;
  notes?: string;
  terms?: string;
  reminderTone?: string;
  // Legacy cadence (keeping for backward compat if needed, or remove)
  reminderCadence?: {
    softDays?: number;
    mediumDays?: number;
    firmDays?: number;
  };
  signatureUrl?: string;
  attachments?: { label: string; url: string }[];
  items: InvoiceItemInput[];
  adjustments?: InvoiceAdjustment[];
  sections?: InvoiceSection[];

  // Reminder configuration
  remindersEnabled?: boolean;
  reminderSchedule?: {
    useDefaults: boolean;
    steps: {
      id?: string;
      daysBeforeDue?: number | null;
      daysAfterDue?: number | null;
      index: number;
      emailTemplateId?: string;
      templateSlug?: string;
      notifyCreator: boolean;
      status?: string;
      sendAt?: string; // ISO date
      label?: string; // For UI display
    }[];
  };

  // Tax configuration
  taxSettings?: {
    inclusive: boolean;        // Prices include tax
    automatic: boolean;        // Auto-detect tax from client location
    defaultRate?: number;      // Default tax rate when automatic is enabled
  };
};

type InvoiceFormProps = {
  data: InvoiceFormState;
  onChange: (data: InvoiceFormState) => void;
  clients: ClientOption[];
  projects: ProjectOption[];
};

type SectionProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

const inputBase =
  "mt-2 w-full rounded-2xl border border-border/70 bg-white/90 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <div className="h-px w-full bg-slate-100" />
      {children}
    </div>
  );
}

export function InvoiceForm({ data, onChange, clients, projects }: InvoiceFormProps) {
  const update = (patch: Partial<InvoiceFormState>) => onChange({ ...data, ...patch });

  const updateItem = (index: number, patch: Partial<InvoiceItemInput>) => {
    const items = data.items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    update({ items });
  };

  return (
    <div className="space-y-5">
      <Section title="Client" icon={<Mail className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-foreground">
            Client
            <div className="relative mt-2">
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-foreground shadow-[0_6px_20px_-12px_rgba(0,0,0,0.12)] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={data.clientId ?? ""}
                onChange={(e) => update({ clientId: e.target.value || undefined })}
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">▾</span>
            </div>
          </label>
          <label className="text-sm font-semibold text-foreground">
            Project
            <div className="relative mt-2">
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-foreground shadow-[0_6px_20px_-12px_rgba(0,0,0,0.12)] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={data.projectId ?? ""}
                onChange={(e) => update({ projectId: e.target.value || undefined })}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">▾</span>
            </div>
          </label>
        </div>
      </Section>

      <Section title="Invoice details" icon={<FileText className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-foreground">
            Business name
            <input
              className={inputBase}
              value={data.businessName || ""}
              onChange={(e) => update({ businessName: e.target.value })}
              placeholder="Your business / brand"
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Logo URL
            <input
              className={inputBase}
              value={data.logoUrl || ""}
              onChange={(e) => update({ logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Invoice #
            <input
              className={inputBase}
              value={data.number}
              onChange={(e) => update({ number: e.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Due date
            <input
              type="date"
              className={inputBase}
              value={data.dueDate || ""}
              onChange={(e) => update({ dueDate: e.target.value })}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-foreground">
            Currency
            <input
              className={inputBase}
              value={data.currency || "INR"}
              onChange={(e) => update({ currency: e.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Reminder tone
            <input
              className={inputBase}
              value={data.reminderTone || "Warm + Polite"}
              onChange={(e) => update({ reminderTone: e.target.value })}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-foreground">
            Subtotal label
            <input
              className={inputBase}
              value={data.subtotalLabel || "Subtotal"}
              onChange={(e) => update({ subtotalLabel: e.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Tax label
            <input
              className={inputBase}
              value={data.taxLabel || "Tax"}
              onChange={(e) => update({ taxLabel: e.target.value })}
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Total label
            <input
              className={inputBase}
              value={data.totalLabel || "Total"}
              onChange={(e) => update({ totalLabel: e.target.value })}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-foreground">
            Extra summary label
            <input
              className={inputBase}
              value={data.extraSummaryLabel || ""}
              onChange={(e) => update({ extraSummaryLabel: e.target.value })}
              placeholder="e.g., Deposit, Fee"
            />
          </label>
          <label className="text-sm font-semibold text-foreground">
            Extra summary value
            <input
              className={inputBase}
              value={data.extraSummaryValue || ""}
              onChange={(e) => update({ extraSummaryValue: e.target.value })}
              placeholder="₹0"
            />
          </label>
        </div>
      </Section>

      <Section title="Items & pricing" icon={<Wallet className="h-4 w-4 text-primary" />}>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[40px_2fr_repeat(3,1fr)] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            <span />
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Rate</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {data.items.map((item, idx) => {
              const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
              return (
                <div key={idx} className="grid grid-cols-[40px_2fr_repeat(3,1fr)] items-center gap-2 px-3 py-2 hover:bg-slate-50">
                  <span className="flex justify-center text-slate-400">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    placeholder="Homepage redesign"
                    value={item.title}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-center outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-center outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                    placeholder="₹ amount"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                  />
                  <span className="text-right text-sm font-semibold text-foreground">₹{lineTotal.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          onClick={() =>
            update({
              items: [...data.items, { title: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </Section>

      <Section title="Payment preferences" icon={<Zap className="h-4 w-4 text-primary" />}>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
            <input type="checkbox" defaultChecked /> Email link
          </label>
          <label className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
            <input type="checkbox" defaultChecked /> WhatsApp link
          </label>
          <label className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
            <input type="checkbox" /> Late fee after 5 days
          </label>
        </div>
      </Section>

      <Section title="Notes & terms" icon={<Users className="h-4 w-4 text-primary" />}>
        <div className="space-y-3">
          <textarea
            className="min-h-[80px] w-full rounded-2xl border border-border/70 bg-white/90 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            placeholder="Thank you for your business. Payment link attached."
            value={data.notes || ""}
            onChange={(e) => update({ notes: e.target.value })}
          />
          <textarea
            className="min-h-[80px] w-full rounded-2xl border border-border/70 bg-white/90 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            placeholder="Net 7 · 1.5% late fee after 5 days overdue."
            value={data.terms || ""}
            onChange={(e) => update({ terms: e.target.value })}
          />
        </div>
      </Section>
    </div>
  );
}
