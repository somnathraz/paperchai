"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceFormState } from "../../invoice-form";

type PaymentTabProps = {
  formState: InvoiceFormState;
  updateField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
  onGenerateRazorpayLink?: () => Promise<void>;
  razorpayLinkLoading?: boolean;
  razorpayConfigured?: boolean;
  savedInvoiceId?: string;
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

export function PaymentTab({
  formState,
  updateField,
  onGenerateRazorpayLink,
  razorpayLinkLoading,
  razorpayConfigured,
  savedInvoiceId,
}: PaymentTabProps) {
  return (
    <div className="space-y-4">
      <SectionCard title="Payment Methods">
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <div>
              <Label className="text-xs font-medium">Payment method</Label>
              <Input
                placeholder="Bank Transfer / UPI / Card link"
                className="mt-2"
                value={formState.paymentMethod || ""}
                onChange={(e) => updateField("paymentMethod", e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div>
              <Label className="text-xs font-medium">Payment link</Label>
              <Input
                placeholder="https://rzp.io/i/... or https://buy.stripe.com/..."
                className="mt-2"
                value={formState.paymentLinkUrl || ""}
                onChange={(e) => updateField("paymentLinkUrl", e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerateRazorpayLink?.()}
                  disabled={
                    !onGenerateRazorpayLink ||
                    !savedInvoiceId ||
                    !razorpayConfigured ||
                    !!razorpayLinkLoading
                  }
                >
                  {razorpayLinkLoading ? "Generating..." : "Generate Razorpay link"}
                </Button>
                {!savedInvoiceId ? (
                  <span className="text-[11px] text-muted-foreground">Save the invoice first.</span>
                ) : null}
                {savedInvoiceId && !razorpayConfigured ? (
                  <span className="text-[11px] text-amber-700">
                    Razorpay env is not configured on the server.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div>
              <Label className="text-xs font-medium">Payment instructions</Label>
              <Textarea
                placeholder="UPI, bank details, payment reference instructions, or collection notes"
                className="mt-2 h-16"
                value={formState.paymentInstructions || ""}
                onChange={(e) => updateField("paymentInstructions", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Partial Payments">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Allow partial payments</Label>
          <Switch
            checked={!!formState.allowPartialPayments}
            onCheckedChange={(checked) => updateField("allowPartialPayments", checked)}
          />
        </div>
      </SectionCard>
      <SectionCard title="Schedule Sending">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Send timing</Label>
          <Select defaultValue="now">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Send now</SelectItem>
              <SelectItem value="schedule">Schedule send</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Use the Schedule button in the header to set date/time.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
