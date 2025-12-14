"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ClientDetail } from "./client-detail";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClientListItem = {
  id: string;
  name: string;
  email?: string | null;
  reliabilityScore: number;
  averageDelayDays: number;
  outstanding: any;
  updatedAt: Date;
};

type ClientsShellProps = {
  clients: ClientListItem[];
  selectedClient: any;
  userName?: string | null;
  userEmail?: string | null;
};

export function ClientsShell({
  clients,
  selectedClient,
  userName,
  userEmail,
}: ClientsShellProps) {
  const [activeClientId, setActiveClientId] = useState<string | null>(
    selectedClient?.id || clients[0]?.id || null
  );
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const initialNewClient = {
    name: "",
    email: "",
    phone: "",
    contactPerson: "",
    whatsapp: "",
    businessType: "Individual",
    tags: "",
    categoryTags: "",
    preferredPaymentMethod: "Bank Transfer",
    paymentTerms: "Net 15",
    preferredCurrency: "INR",
    lateFeeRules: "",
    taxId: "",
    reminderChannel: "Email",
    tonePreference: "Warm",
    escalationRule: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    notes: "",
    internalNotes: "",
    riskBadge: "Reliable",
    paymentPrediction: "",
  };
  const [newClient, setNewClient] = useState(initialNewClient);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [clients, query]);

  const activeClient =
    activeClientId === selectedClient?.id ? selectedClient : null;

  const handleSaveClient = async () => {
    if (!newClient.name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        const { client } = await res.json();
        const updated = [client, ...clients];
        // @ts-ignore mutate current list
        clients.splice(0, clients.length, ...updated);
        setActiveClientId(client.id);
        setShowNew(false);
        setNewClient(initialNewClient);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 lg:px-8">

        {/* LEFT PANEL — CLIENT LIST */}
        <aside className="w-[280px] shrink-0 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="px-4 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Clients
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {clients.length} total
                  </p>
                </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full bg-primary shadow-primary/40"
                  onClick={() => setShowNew((v) => !v)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search clients..."
                className="pl-9"
              />
            </div>
          </div>

          {/* CLIENT LIST SCROLL AREA */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="divide-y divide-slate-100">
              {filtered.map((client) => {
                const active = client.id === activeClientId;

                const badgeColor =
                  client.reliabilityScore >= 80
                    ? "bg-emerald-100 text-emerald-700"
                    : client.reliabilityScore >= 60
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700";

                return (
                  <Button
                    key={client.id}
                    variant="ghost"
                    onClick={() => setActiveClientId(client.id)}
                    className={`w-full justify-between px-4 py-3 h-auto ${
                      active
                        ? "bg-primary/5 border-l-2 border-primary"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {client.email || "No email"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Outstanding: ₹
                        {Number(client.outstanding || 0).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-[2px] text-[10px] font-semibold ${badgeColor}`}
                    >
                      {client.reliabilityScore}
                    </span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* RIGHT PANEL — DETAIL */}
        <div className="flex-1">
          <ClientDetail
            client={activeClient}
            userName={userName}
            userEmail={userEmail}
          />
        </div>
      </div>

      {/* ADD CLIENT MODAL */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Identity */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Identity</p>
              <p className="text-xs text-muted-foreground">
                Basic details that show up on invoices and reminders.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter client name"
                    value={newClient.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact person</label>
                  <Input
                    placeholder="Person you coordinate with"
                    value={newClient.contactPerson}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, contactPerson: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={newClient.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newClient.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp</label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newClient.whatsapp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, whatsapp: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business type</label>
                  <Select
                    value={newClient.businessType}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, businessType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Individual",
                        "Startup",
                        "Studio",
                        "Agency",
                        "International Client",
                      ].map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tags & behavior */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Tags & behavior</p>
              <p className="text-xs text-muted-foreground">
                Categorize clients and set follow-up preferences.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    placeholder="e.g., VIP, Recurring, Priority"
                    value={newClient.tags}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, tags: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple tags with commas.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category tags</label>
                  <Input
                    placeholder="Design, Retainer, International"
                    value={newClient.categoryTags}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, categoryTags: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder channel</label>
                  <Select
                    value={newClient.reminderChannel}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, reminderChannel: v })
                    }
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone preference</label>
                  <Select
                    value={newClient.tonePreference}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, tonePreference: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tone" />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Escalation rule</label>
                  <Input
                    placeholder="e.g., Firm reminder after 7 days overdue"
                    value={newClient.escalationRule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, escalationRule: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk badge</label>
                  <Select
                    value={newClient.riskBadge}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, riskBadge: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Reliable", "Sometimes Late", "High Risk"].map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Payment & finance</p>
              <p className="text-xs text-muted-foreground">
                Defaults used when creating invoices for this client.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred payment method</label>
                  <Select
                    value={newClient.preferredPaymentMethod}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, preferredPaymentMethod: v })
                    }
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment terms</label>
                  <Select
                    value={newClient.paymentTerms}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, paymentTerms: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Immediate", "Net 7", "Net 15", "Net 30", "Net 45"].map(
                        (opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred currency</label>
                  <Select
                    value={newClient.preferredCurrency}
                    onValueChange={(v: string) =>
                      setNewClient({ ...newClient, preferredCurrency: v })
                    }
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax / GST ID</label>
                  <Input
                    placeholder="GSTIN / Tax ID"
                    value={newClient.taxId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, taxId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Late fee rules</label>
                  <Input
                    placeholder="e.g., 1.5% after 7 days"
                    value={newClient.lateFeeRules}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, lateFeeRules: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment prediction</label>
                  <Input
                    placeholder="e.g., Likely to pay in 5 days"
                    value={newClient.paymentPrediction}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({
                        ...newClient,
                        paymentPrediction: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Address</p>
              <p className="text-xs text-muted-foreground">
                Optional, used for agreements and invoices.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Address line 1</label>
                  <Input
                    placeholder="Street, building"
                    value={newClient.addressLine1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, addressLine1: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Address line 2</label>
                  <Input
                    placeholder="Apartment, suite, etc."
                    value={newClient.addressLine2}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, addressLine2: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input
                    placeholder="City"
                    value={newClient.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input
                    placeholder="State"
                    value={newClient.state}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postal code</label>
                  <Input
                    placeholder="PIN / ZIP"
                    value={newClient.postalCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, postalCode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    placeholder="Country"
                    value={newClient.country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewClient({ ...newClient, country: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Notes</p>
              <p className="text-xs text-muted-foreground">
                Public and internal notes that help you remember context.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (shared)</label>
                  <Textarea
                    placeholder="Friendly note, brand preferences, project context"
                    value={newClient.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewClient({ ...newClient, notes: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal notes</label>
                  <Textarea
                    placeholder="Red flags, pricing strategy, follow-up rules"
                    value={newClient.internalNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewClient({ ...newClient, internalNotes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>
                💡 <strong>Note:</strong> Reliability score and predictions will
                adjust automatically once invoices and reminders flow in.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNew(false);
                setNewClient(initialNewClient);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveClient}
              disabled={!newClient.name || creating}
            >
              {creating ? "Saving…" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
