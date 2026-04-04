"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceFormState } from "../../invoice-form";

type InvoiceMetaSectionProps = {
  formState: InvoiceFormState;
  updateField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function InvoiceMetaSection({ formState, updateField }: InvoiceMetaSectionProps) {
  return (
    <SectionCard title="Invoice Meta">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Document Title</Label>
        <Input
          value={formState.documentTitle || "INVOICE"}
          onChange={(e) => updateField("documentTitle", e.target.value)}
          placeholder="INVOICE"
          className="mt-1.5"
        />
        <p className="text-[11px] text-muted-foreground mt-1">E.g. INVOICE, BILL, RECEIPT, QUOTE</p>
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Invoice Number</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={formState.number}
            onChange={(e) => updateField("number", e.target.value)}
            placeholder="INV-2024-001"
          />
          <Switch
            checked={!formState.number || formState.number.startsWith("INV-")}
            onCheckedChange={(checked) => {
              if (checked && !formState.number) {
                updateField(
                  "number",
                  `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
                );
              }
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Auto-number enabled</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Invoice Date</Label>
          <Input
            type="date"
            value={
              formState.date
                ? new Date(formState.date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]
            }
            onChange={(e) => updateField("date", e.target.value || undefined)}
            className="mt-2"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
          <Select
            value={(() => {
              if (!formState.dueDate) return "none";
              const start = formState.date ? new Date(formState.date) : new Date();
              const due = new Date(formState.dueDate);
              start.setHours(0, 0, 0, 0);
              due.setHours(0, 0, 0, 0);
              const diff = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

              if (diff === 0) return "today";
              if (diff === 7) return "7";
              if (diff === 15) return "15";
              if (diff === 30) return "30";
              return "custom";
            })()}
            onValueChange={(v) => {
              const base = formState.date ? new Date(formState.date) : new Date();
              const target = new Date(base);

              if (v === "today") target.setDate(base.getDate());
              else if (v === "7") target.setDate(base.getDate() + 7);
              else if (v === "15") target.setDate(base.getDate() + 15);
              else if (v === "30") target.setDate(base.getDate() + 30);

              updateField("dueDate", target.toISOString());
            }}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Due on receipt</SelectItem>
              <SelectItem value="7">Net 7</SelectItem>
              <SelectItem value="15">Net 15</SelectItem>
              <SelectItem value="30">Net 30</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Reference / PO</Label>
        <Input
          value={formState.extraSummaryLabel || ""}
          onChange={(e) => updateField("extraSummaryLabel", e.target.value)}
          placeholder="PO-12345"
          className="mt-2"
        />
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
        <Input placeholder="Add tags (comma separated)" className="mt-2" />
        <div className="flex flex-wrap gap-1 mt-2">{/* Tags would go here */}</div>
      </div>
    </SectionCard>
  );
}
