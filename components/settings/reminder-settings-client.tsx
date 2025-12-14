"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, Mail, MessageCircle, Plus, Settings2, Zap, ChevronDown, Users, FileText, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ReminderStep = {
    index: number;
    daysBeforeDue?: number;
    daysAfterDue?: number;
    label: string;
    templateSlug: string;
    notifyCreator: boolean;
};

const DEFAULT_STEPS: ReminderStep[] = [
    { index: 0, daysBeforeDue: 3, label: "Gentle Reminder", templateSlug: "reminder-gentle", notifyCreator: false },
    { index: 1, daysAfterDue: 1, label: "Due Date Follow-up", templateSlug: "reminder-standard", notifyCreator: true },
    { index: 2, daysAfterDue: 7, label: "Overdue Warning", templateSlug: "reminder-assertive", notifyCreator: true },
];

const TONES = [
    { value: "Warm + Polite", label: "Warm + Polite", description: "Friendly, appreciative tone" },
    { value: "Professional", label: "Professional", description: "Business-like, formal" },
    { value: "Friendly", label: "Friendly", description: "Casual, personal approach" },
    { value: "Firm", label: "Firm", description: "Direct, assertive" },
];

type Client = { id: string; name: string };
type Invoice = { id: string; number: string; clientId: string; total: string };

export function ReminderSettingsClient() {
    const [enabled, setEnabled] = useState(true);
    const [tone, setTone] = useState("Warm + Polite");
    const [timezone, setTimezone] = useState("Asia/Kolkata");
    const [steps, setSteps] = useState<ReminderStep[]>(DEFAULT_STEPS);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // For creating new reminders
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>("");
    const [selectedInvoice, setSelectedInvoice] = useState<string>("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [settingsRes, clientsRes, invoicesRes] = await Promise.all([
                    fetch("/api/reminders/settings"),
                    fetch("/api/clients/list"),
                    fetch("/api/invoices/list?status=draft,pending,overdue"),
                ]);

                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    if (data.settings) {
                        setEnabled(data.settings.enabled ?? true);
                        setTimezone(data.settings.timezone || "Asia/Kolkata");
                    }
                }

                if (clientsRes.ok) {
                    const data = await clientsRes.json();
                    setClients(data.clients || []);
                }

                if (invoicesRes.ok) {
                    const data = await invoicesRes.json();
                    setInvoices(data.invoices || []);
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch("/api/reminders/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled, timezone }),
            });
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setSaving(false);
        }
    };

    const handleEnableForInvoice = async () => {
        if (!selectedInvoice) return;

        try {
            await fetch(`/api/invoices/${selectedInvoice}/reminders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enabled: true,
                    useDefaults: true,
                    steps: steps,
                }),
            });
            setShowCreateForm(false);
            setSelectedInvoice("");
        } catch (err) {
            console.error("Failed to enable reminders for invoice", err);
        }
    };

    const filteredInvoices = selectedClient
        ? invoices.filter(inv => inv.clientId === selectedClient)
        : invoices;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Global Settings */}
            <section className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                <header className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Global</p>
                        <h3 className="text-lg font-semibold text-foreground">Reminder Automation</h3>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </header>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="mt-4">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                </Button>
            </section>

            {/* Tone Selection */}
            <section className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                <header>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tone</p>
                    <h3 className="text-lg font-semibold text-foreground">Default Communication Style</h3>
                </header>
                <div className="grid gap-3 sm:grid-cols-4">
                    {TONES.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setTone(t.value)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${tone === t.value
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border/70 hover:border-primary/50"
                                }`}
                        >
                            <p className="text-sm font-semibold">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground">{t.description}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Default Steps */}
            <section className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                <header>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Cadence</p>
                    <h3 className="text-lg font-semibold text-foreground">Default Reminder Steps</h3>
                    <p className="text-sm text-muted-foreground">These steps apply to new invoices with reminders enabled.</p>
                </header>

                <div className="space-y-3 relative">
                    <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border/50" />

                    {steps.map((step, idx) => (
                        <div key={idx} className="relative pl-10">
                            <div className="absolute left-2.5 top-4 h-3 w-3 rounded-full border-2 border-primary bg-white z-10" />
                            <div className="rounded-xl border border-border/60 bg-white p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {step.daysBeforeDue ? `${step.daysBeforeDue} days before` : `${step.daysAfterDue} days after`}
                                        </Badge>
                                        {step.notifyCreator && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Notify me</Badge>}
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Label</Label>
                                        <Input
                                            value={step.label}
                                            onChange={(e) => {
                                                const newSteps = [...steps];
                                                newSteps[idx].label = e.target.value;
                                                setSteps(newSteps);
                                            }}
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Days</Label>
                                        <Input
                                            type="number"
                                            value={step.daysBeforeDue || step.daysAfterDue || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                const newSteps = [...steps];
                                                if (step.daysBeforeDue !== undefined) newSteps[idx].daysBeforeDue = val;
                                                else newSteps[idx].daysAfterDue = val;
                                                setSteps(newSteps);
                                            }}
                                            className="h-8 text-xs mt-1"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {step.daysBeforeDue !== undefined ? "Days before due date" : "Days after due date"}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Template</Label>
                                        <Select
                                            value={step.templateSlug}
                                            onValueChange={(v) => {
                                                const newSteps = [...steps];
                                                newSteps[idx].templateSlug = v;
                                                setSteps(newSteps);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="reminder-gentle">Gentle</SelectItem>
                                                <SelectItem value="reminder-standard">Standard</SelectItem>
                                                <SelectItem value="reminder-assertive">Assertive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Create Reminder for Invoice */}
            <section className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                <header className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick Action</p>
                        <h3 className="text-lg font-semibold text-foreground">Enable Reminders for Invoice</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                        <Plus className="h-4 w-4 mr-1" />
                        {showCreateForm ? "Cancel" : "New"}
                    </Button>
                </header>

                {showCreateForm && (
                    <div className="space-y-4 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="text-xs">Filter by Client (optional)</Label>
                                <Select value={selectedClient} onValueChange={setSelectedClient}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="All clients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All clients</SelectItem>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Select Invoice</Label>
                                <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Choose invoice" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredInvoices.map(inv => (
                                            <SelectItem key={inv.id} value={inv.id}>
                                                {inv.number} - ₹{inv.total}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button onClick={handleEnableForInvoice} disabled={!selectedInvoice}>
                            <Zap className="h-4 w-4 mr-2" />
                            Enable Reminders
                        </Button>
                    </div>
                )}
            </section>

            {/* Preview */}
            <section className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">WhatsApp preview</p>
                    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-white to-emerald-50 p-4 text-sm text-foreground shadow-inner">
                        <p className="text-xs text-muted-foreground">You → Client</p>
                        <p className="mt-2">
                            Hey there — hope you&apos;re doing well! Dropping a warm reminder for invoice <strong>#108</strong> (₹18,200).
                        </p>
                        <p className="mt-2">Tap to pay: paperchai.com/pay/108</p>
                    </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Email preview</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Subject: Friendly reminder · Invoice #108</p>
                        <p>
                            Hi there,<br />
                            Hope everything&apos;s going well. Dropping a reminder for invoice #108 (₹18,200) due on Jan 19. Let me know if
                            you need anything else.
                        </p>
                        <p className="text-muted-foreground">— Your Team</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
