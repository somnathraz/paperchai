"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PaymentSettings = {
  defaultPaymentMethod: string;
  paymentInstructions: string;
  paymentLinkBaseUrl: string;
  upiId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
};

const DEFAULT_SETTINGS: PaymentSettings = {
  defaultPaymentMethod: "Bank Transfer",
  paymentInstructions: "",
  paymentLinkBaseUrl: "",
  upiId: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",
};

export function PaymentSettingsPanel() {
  const [form, setForm] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [initial, setInitial] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/workspace/settings");
        if (!res.ok) return;
        const data = await res.json();
        const next = {
          defaultPaymentMethod: data.defaultPaymentMethod || "Bank Transfer",
          paymentInstructions: data.paymentInstructions || "",
          paymentLinkBaseUrl: data.paymentLinkBaseUrl || "",
          upiId: data.upiId || "",
          bankAccountName: data.bankAccountName || "",
          bankAccountNumber: data.bankAccountNumber || "",
          bankIfsc: data.bankIfsc || "",
          bankName: data.bankName || "",
        };
        setForm(next);
        setInitial(next);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initial);

  const update = (key: keyof PaymentSettings, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildInstructions = () => {
    const parts = [form.paymentInstructions.trim()];
    if (form.upiId.trim()) {
      parts.push(`UPI: ${form.upiId.trim()}`);
    }
    if (form.bankName.trim() || form.bankAccountNumber.trim() || form.bankIfsc.trim()) {
      const bankParts = [
        form.bankName.trim() ? `Bank: ${form.bankName.trim()}` : null,
        form.bankAccountName.trim() ? `Account Name: ${form.bankAccountName.trim()}` : null,
        form.bankAccountNumber.trim() ? `Account No: ${form.bankAccountNumber.trim()}` : null,
        form.bankIfsc.trim() ? `IFSC: ${form.bankIfsc.trim()}` : null,
      ].filter(Boolean);
      if (bankParts.length > 0) {
        parts.push(bankParts.join("\n"));
      }
    }
    return parts.filter(Boolean).join("\n\n");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPaymentMethod: form.defaultPaymentMethod,
          paymentInstructions: form.paymentInstructions,
          paymentLinkBaseUrl: form.paymentLinkBaseUrl,
          upiId: form.upiId,
          bankAccountName: form.bankAccountName,
          bankAccountNumber: form.bankAccountNumber,
          bankIfsc: form.bankIfsc,
          bankName: form.bankName,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save payment settings");
      }

      setInitial(form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/70 p-6 text-sm text-muted-foreground">
        Loading payment settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Razorpay payment links are supported</p>
          <p className="mt-1 text-emerald-800">
            Save your bank or UPI defaults here, then generate invoice-specific Razorpay links from
            the invoice editor. Server setup still needs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
            `RAZORPAY_WEBHOOK_SECRET`, and a public webhook URL pointing to
            `/api/webhooks/razorpay`.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default payment method</Label>
            <Input
              value={form.defaultPaymentMethod}
              onChange={(e) => update("defaultPaymentMethod", e.target.value)}
              placeholder="Bank Transfer"
            />
          </div>
          <div className="space-y-2">
            <Label>Default payment link</Label>
            <Input
              value={form.paymentLinkBaseUrl}
              onChange={(e) => update("paymentLinkBaseUrl", e.target.value)}
              placeholder="https://rzp.io/i/..."
            />
          </div>
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <Input
              value={form.upiId}
              onChange={(e) => update("upiId", e.target.value)}
              placeholder="yourname@upi"
            />
          </div>
          <div className="space-y-2">
            <Label>Bank name</Label>
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
              placeholder="HDFC Bank"
            />
          </div>
          <div className="space-y-2">
            <Label>Account name</Label>
            <Input
              value={form.bankAccountName}
              onChange={(e) => update("bankAccountName", e.target.value)}
              placeholder="PaperChai Studio"
            />
          </div>
          <div className="space-y-2">
            <Label>Account number</Label>
            <Input
              value={form.bankAccountNumber}
              onChange={(e) => update("bankAccountNumber", e.target.value)}
              placeholder="000123456789"
            />
          </div>
          <div className="space-y-2">
            <Label>IFSC / routing code</Label>
            <Input
              value={form.bankIfsc}
              onChange={(e) => update("bankIfsc", e.target.value)}
              placeholder="HDFC0001234"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Default payment instructions</Label>
          <Textarea
            value={form.paymentInstructions}
            onChange={(e) => update("paymentInstructions", e.target.value)}
            placeholder="Payment due via bank transfer or UPI. Add the invoice number as reference."
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            These defaults prefill the invoice payment block. Users can override per invoice.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Preview</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {buildInstructions() || "No payment instructions configured yet."}
            </pre>
          </div>
          <Button onClick={save} disabled={!hasChanges || saving}>
            {saving ? "Saving..." : "Save payment settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
