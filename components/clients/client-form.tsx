"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

// Dynamic import for AI Project Wizard (~55KB) - loads only when AI tab is active
const AiProjectWizard = dynamic(
  () => import("@/components/clients/ai-project-wizard").then((m) => m.AiProjectWizard),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading AI Wizard...</p>
      </div>
    ),
    ssr: false,
  }
);


type ClientFormProps = {
  onSuccess?: () => void;
};

export function ClientForm({ onSuccess }: ClientFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    name: "",
    businessType: "Individual",
    categoryTags: "",
    tags: "",
    contactPerson: "",
    email: "",
    phone: "",
    whatsapp: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    preferredCurrency: "INR",
    preferredPaymentMethod: "Bank Transfer",
    paymentTerms: "Net 15",
    lateFeeRules: "",
    taxId: "",
    reminderChannel: "Email",
    tonePreference: "Warm",
    escalationRule: "",
    notes: "",
    internalNotes: "",
  });

  // Duplicate Detection
  const [duplicateClient, setDuplicateClient] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const checkDuplicateClient = async (name: string, email: string) => {
    try {
      const params = new URLSearchParams();
      if (name) params.append("search", name);

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        // Filter for likely matches (Exact ignore case + trim)
        const match = result.clients.find((c: any) =>
          (c.name.toLowerCase().trim() === name.toLowerCase().trim()) ||
          (email && c.email?.toLowerCase().trim() === email.toLowerCase().trim())
        );
        return match || null;
      }
      return null;
    } catch (e) {
      console.error("Failed to check duplicates", e);
      return null;
    }
  };

  const handleSave = async (force: boolean = false) => {
    if (!data.name || !data.email) return;

    if (!force) {
      // Check for duplicates first
      const match = await checkDuplicateClient(data.name, data.email);
      if (match) {
        setDuplicateClient(match);
        setShowDuplicateDialog(true);
        return;
      }
    }

    setSaving(true);
    setShowDuplicateDialog(false);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/clients");
        }
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof typeof data, value: string) => setData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Create client</p>
          <h1 className="text-2xl font-semibold text-slate-900">Client workspace</h1>
          <p className="text-sm text-slate-600">Store identity, agreements, payment prefs, and behaviour settings.</p>
        </div>
        {activeTab === "manual" && (
          <Button
            onClick={() => handleSave(false)}
            disabled={saving || !data.name || !data.email}
            className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary shadow-primary/30"
          >
            {saving ? "Saving..." : "Create client"}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            ✨ Import from Document (AI)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <AiProjectWizard onSuccess={onSuccess} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="text-base font-semibold text-slate-900">Identity</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Client name *"
                value={data.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)}
              />
              <Select
                value={data.businessType}
                onValueChange={(v: string) => setField("businessType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Business type" />
                </SelectTrigger>
                <SelectContent>
                  {["Individual", "Startup", "Studio", "Agency", "International Client"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Contact person"
                value={data.contactPerson}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("contactPerson", e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email *"
                value={data.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("email", e.target.value)}
              />
              <Input
                type="tel"
                placeholder="Phone"
                value={data.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("phone", e.target.value)}
              />
              <Input
                type="tel"
                placeholder="WhatsApp"
                value={data.whatsapp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("whatsapp", e.target.value)}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={data.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("tags", e.target.value)}
              />
              <Input
                placeholder="Category tags"
                value={data.categoryTags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("categoryTags", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="text-base font-semibold text-slate-900">Address & location</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Address line 1"
                value={data.addressLine1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("addressLine1", e.target.value)}
              />
              <Input
                placeholder="Address line 2"
                value={data.addressLine2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("addressLine2", e.target.value)}
              />
              <Input
                placeholder="City"
                value={data.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("city", e.target.value)}
              />
              <Input
                placeholder="State"
                value={data.state}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("state", e.target.value)}
              />
              <Input
                placeholder="Pincode"
                value={data.postalCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("postalCode", e.target.value)}
              />
              <Input
                placeholder="Country"
                value={data.country}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("country", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="text-base font-semibold text-slate-900">Payment & finance</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={data.preferredCurrency}
                onValueChange={(v: string) => setField("preferredCurrency", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {["INR", "USD", "EUR", "GBP"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={data.preferredPaymentMethod}
                onValueChange={(v: string) => setField("preferredPaymentMethod", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  {["Bank Transfer", "UPI", "PayPal", "Wise"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Late fee rules"
                value={data.lateFeeRules}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("lateFeeRules", e.target.value)}
              />
              <Input
                placeholder="GST / Tax ID"
                value={data.taxId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("taxId", e.target.value)}
              />
              <Select
                value={data.paymentTerms}
                onValueChange={(v: string) => setField("paymentTerms", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {["Immediate", "Net 7", "Net 15", "Net 30", "Net 45", "Custom"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="text-base font-semibold text-slate-900">Behaviour & reminders</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={data.reminderChannel}
                onValueChange={(v: string) => setField("reminderChannel", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reminder channel" />
                </SelectTrigger>
                <SelectContent>
                  {["Email", "WhatsApp", "Both"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={data.tonePreference}
                onValueChange={(v: string) => setField("tonePreference", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tone preference" />
                </SelectTrigger>
                <SelectContent>
                  {["Warm", "Friendly", "Firm"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Escalation rule (e.g., After 7 days overdue → firm reminder)"
              value={data.escalationRule}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("escalationRule", e.target.value)}
            />
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h3 className="text-base font-semibold text-slate-900">Notes & internal</h3>
            <Textarea
              placeholder="Client notes (shared context)"
              value={data.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setField("notes", e.target.value)}
              className="min-h-[80px]"
            />
            <Textarea
              placeholder="Internal notes (private: red flags, pricing, etc.)"
              value={data.internalNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setField("internalNotes", e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </TabsContent>
      </Tabs>


      {/* Duplicate Client Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Already Exists</DialogTitle>
            <DialogDescription>
              We found a client that matches <strong>{duplicateClient?.name}</strong>.
              Creating a duplicate might confuse your records.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-700">
            <p><strong>Existing Client:</strong> {duplicateClient?.name}</p>
            <p><strong>Email:</strong> {duplicateClient?.email || "N/A"}</p>
            <p><strong>Company:</strong> {duplicateClient?.company || "N/A"}</p>
            <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">This client already has {duplicateClient?.projectsCount || 0} projects.</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => handleSave(true)} className="text-slate-500 hover:text-slate-700">
              Create Duplicate Anyway
            </Button>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push(`/clients/${duplicateClient?.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Existing Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
