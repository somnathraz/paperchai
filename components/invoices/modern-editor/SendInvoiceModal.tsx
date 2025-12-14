"use client";

import { useState } from "react";
import {
    ArrowRight,
    ArrowLeft,
    Send,
    Mail,
    MessageSquare,
    Calendar,
    Clock,
    Bell,
    User,
    Building2,
    FileText,
    Check,
    Sparkles,
    Zap,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Client = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
};

type Project = {
    id: string;
    name: string;
    description?: string | null;
};

type InvoiceData = {
    number: string;
    total: number;
    subtotal: number;
    tax: number;
    dueDate?: string;
    items: Array<{ name: string; quantity: number; rate: number; amount: number }>;
    currency: string;
};

type SendInvoiceModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: InvoiceData;
    client?: Client | null;
    project?: Project | null;
    templateName?: string;
    onSend: (options: SendOptions) => Promise<void>;
    initialAutomationEnabled?: boolean;
};

type SendOptions = {
    channel: "email" | "whatsapp" | "both";
    automationEnabled: boolean;
    reminderSettings?: {
        startDaysBefore: number;
        followUpDays: number;
        maxReminders: number;
        channels: ("email" | "whatsapp")[];
        tone: "polite" | "friendly" | "firm";
        autoStopOnPayment: boolean;
    };
};

type Step = "preview" | "automation" | "confirm";

export function SendInvoiceModal({
    open,
    onOpenChange,
    invoice,
    client,
    project,
    templateName = "Classic Gray",
    onSend,
    initialAutomationEnabled = true,
}: SendInvoiceModalProps) {
    const [step, setStep] = useState<Step>("preview");
    const [isSending, setIsSending] = useState(false);

    // Send options
    const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
    const [automationEnabled, setAutomationEnabled] = useState(initialAutomationEnabled);

    // Automation settings
    const [startDaysBefore, setStartDaysBefore] = useState(3);
    const [followUpDays, setFollowUpDays] = useState(7);
    const [maxReminders, setMaxReminders] = useState(3);
    const [reminderChannels, setReminderChannels] = useState<("email" | "whatsapp")[]>(["email"]);
    const [tone, setTone] = useState<"polite" | "friendly" | "firm">("friendly");
    const [autoStopOnPayment, setAutoStopOnPayment] = useState(true);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);

    // Email capture for clients without email
    const [capturedEmail, setCapturedEmail] = useState("");

    const formatCurrency = (amount: number) => {
        const symbol = invoice.currency === "USD" ? "$" : invoice.currency === "EUR" ? "€" : "₹";
        return `${symbol}${amount.toLocaleString("en-IN")}`;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Not set";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const handleSend = async () => {
        setIsSending(true);
        try {
            await onSend({
                channel,
                automationEnabled,
                reminderSettings: automationEnabled
                    ? {
                        startDaysBefore,
                        followUpDays,
                        maxReminders,
                        channels: reminderChannels,
                        tone,
                        autoStopOnPayment,
                    }
                    : undefined,
            });
            onOpenChange(false);
            setStep("preview"); // Reset for next time
        } catch {
            // Error handled by parent
        } finally {
            setIsSending(false);
        }
    };

    const toggleReminderChannel = (ch: "email" | "whatsapp") => {
        setReminderChannels((prev) =>
            prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
        );
    };

    const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
        { id: "preview", label: "Preview", icon: <FileText className="h-4 w-4" /> },
        { id: "automation", label: "Automation", icon: <Zap className="h-4 w-4" /> },
        { id: "confirm", label: "Send", icon: <Send className="h-4 w-4" /> },
    ];

    const activeIndex = steps.findIndex((s) => s.id === step);

    // Check if we can proceed to next step
    const canProceed = () => {
        // Need either client email or captured email for email/both channels
        if (channel === "whatsapp") return true;
        if (client?.email) return true;
        if (capturedEmail && capturedEmail.includes("@")) return true;
        return false;
    };

    const showToast = (message: string, type: "info" | "error" = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleProceedToAutomation = () => {
        if (!client) {
            showToast("Please select a client first", "error");
            return;
        }
        if (!canProceed()) {
            showToast("Add client email to send invoice via Email", "info");
            return;
        }
        setStep("automation");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary" />
                        Send Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Review your invoice and set up automation before sending.
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 py-3 border-b border-border/60">
                    {steps.map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <button
                                onClick={() => idx <= activeIndex && setStep(s.id)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                                    step === s.id
                                        ? "bg-primary text-primary-foreground"
                                        : idx < activeIndex
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-muted text-muted-foreground"
                                )}
                            >
                                {idx < activeIndex ? (
                                    <Check className="h-3 w-3" />
                                ) : (
                                    s.icon
                                )}
                                {s.label}
                            </button>
                            {idx < steps.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto py-4">
                    {/* STEP 1: Preview */}
                    {step === "preview" && (
                        <div className="space-y-4">
                            {/* Invoice Summary Card */}
                            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice</p>
                                        <p className="text-lg font-semibold">{invoice.number || "Draft"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</p>
                                        <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.total)}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Due: {formatDate(invoice.dueDate)}
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">
                                        {templateName}
                                    </Badge>
                                </div>
                            </div>

                            {/* Client & Project */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border/60 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Client</span>
                                    </div>
                                    {client ? (
                                        <div>
                                            <p className="text-sm font-medium">{client.name}</p>
                                            {client.company && (
                                                <p className="text-xs text-muted-foreground">{client.company}</p>
                                            )}
                                            {client.email ? (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Mail className="h-3 w-3" />
                                                    {client.email}
                                                </p>
                                            ) : (
                                                <div className="mt-2">
                                                    <Label className="text-[10px] text-amber-600">Email required for sending</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="client@example.com"
                                                        value={capturedEmail}
                                                        onChange={(e) => setCapturedEmail(e.target.value)}
                                                        className="h-8 text-xs mt-1"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-amber-600">No client selected</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-border/60 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">Project</span>
                                    </div>
                                    {project ? (
                                        <p className="text-sm font-medium">{project.name}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No project</p>
                                    )}
                                </div>
                            </div>

                            {/* Items Summary */}
                            <div className="rounded-lg border border-border/60 p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Items ({invoice.items.length})</p>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {invoice.items.slice(0, 5).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="truncate flex-1">{item.name}</span>
                                            <span className="font-medium ml-2">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    {invoice.items.length > 5 && (
                                        <p className="text-xs text-muted-foreground">+{invoice.items.length - 5} more items</p>
                                    )}
                                </div>
                                <div className="border-t border-border/40 mt-3 pt-2 flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(invoice.subtotal)}</span>
                                </div>
                                {invoice.tax > 0 && (
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Tax</span>
                                        <span>{formatCurrency(invoice.tax)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold text-primary mt-1">
                                    <span>Total</span>
                                    <span>{formatCurrency(invoice.total)}</span>
                                </div>
                            </div>

                            {/* Send Channel */}
                            <div className="rounded-lg border border-border/60 p-3">
                                <Label className="text-xs font-medium text-muted-foreground">Send via</Label>
                                <div className="flex gap-2 mt-2">
                                    {[
                                        { id: "email" as const, label: "Email", icon: Mail },
                                        { id: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
                                        { id: "both" as const, label: "Both", icon: Sparkles },
                                    ].map((ch) => (
                                        <button
                                            key={ch.id}
                                            onClick={() => setChannel(ch.id)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 rounded-lg border p-2.5 transition-all",
                                                channel === ch.id
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-border/60 hover:border-primary/40"
                                            )}
                                        >
                                            <ch.icon className="h-4 w-4" />
                                            <span className="text-xs font-medium">{ch.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Automation Status Banner */}
                            {automationEnabled && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-amber-600" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-800">Automation Active</p>
                                            <p className="text-[10px] text-amber-700">Reminders will be sent automatically</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                                        onClick={handleProceedToAutomation}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Automation Setup */}
                    {step === "automation" && (
                        <div className="space-y-4">
                            {/* Enable Automation Toggle */}
                            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                            <Zap className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Enable Auto-Reminders</p>
                                            <p className="text-xs text-muted-foreground">
                                                Automatically follow up until payment is received
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={automationEnabled}
                                        onCheckedChange={setAutomationEnabled}
                                    />
                                </div>
                            </div>

                            {automationEnabled && (
                                <>
                                    {/* When to Start */}
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-xs font-medium">When should reminders start?</Label>
                                        </div>
                                        <div className="px-2">
                                            <Slider
                                                value={[startDaysBefore]}
                                                onValueChange={(values: number[]) => setStartDaysBefore(values[0])}
                                                min={0}
                                                max={7}
                                                step={1}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span>On due date</span>
                                                <span className="font-medium text-primary">
                                                    {startDaysBefore === 0
                                                        ? "On due date"
                                                        : `${startDaysBefore} days before due`}
                                                </span>
                                                <span>7 days before</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Follow-up Cadence */}
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-xs font-medium">Follow-up every</Label>
                                        </div>
                                        <div className="flex gap-2">
                                            {[3, 5, 7, 14].map((days) => (
                                                <button
                                                    key={days}
                                                    onClick={() => setFollowUpDays(days)}
                                                    className={cn(
                                                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                                                        followUpDays === days
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border/60 hover:border-primary/40"
                                                    )}
                                                >
                                                    {days} days
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Max Reminders */}
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-xs font-medium">Maximum reminders</Label>
                                        </div>
                                        <div className="flex gap-2">
                                            {[2, 3, 5, 10].map((count) => (
                                                <button
                                                    key={count}
                                                    onClick={() => setMaxReminders(count)}
                                                    className={cn(
                                                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                                                        maxReminders === count
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border/60 hover:border-primary/40"
                                                    )}
                                                >
                                                    {count}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reminder Channels */}
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <Label className="text-xs font-medium">Reminder channels</Label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleReminderChannel("email")}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all",
                                                    reminderChannels.includes("email")
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border/60 text-muted-foreground"
                                                )}
                                            >
                                                <Mail className="h-4 w-4" />
                                                <span className="text-xs font-medium">Email</span>
                                                {reminderChannels.includes("email") && <Check className="h-3 w-3" />}
                                            </button>
                                            <button
                                                onClick={() => toggleReminderChannel("whatsapp")}
                                                className={cn(
                                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all",
                                                    reminderChannels.includes("whatsapp")
                                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                                                        : "border-border/60 text-muted-foreground"
                                                )}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="text-xs font-medium">WhatsApp</span>
                                                {reminderChannels.includes("whatsapp") && <Check className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tone */}
                                    <div className="rounded-lg border border-border/60 p-4 space-y-3">
                                        <Label className="text-xs font-medium">Reminder tone</Label>
                                        <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="polite">😊 Polite — Gentle and courteous</SelectItem>
                                                <SelectItem value="friendly">💛 Friendly — Warm and casual</SelectItem>
                                                <SelectItem value="firm">💼 Firm — Direct and professional</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Auto-stop */}
                                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                                        <div>
                                            <p className="text-sm font-medium">Stop reminders on payment</p>
                                            <p className="text-xs text-muted-foreground">
                                                Automatically stop when invoice is marked paid
                                            </p>
                                        </div>
                                        <Switch
                                            checked={autoStopOnPayment}
                                            onCheckedChange={setAutoStopOnPayment}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Confirm */}
                    {step === "confirm" && (
                        <div className="space-y-4">
                            {/* Summary Card */}
                            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Send className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold">Ready to Send!</p>
                                        <p className="text-sm text-muted-foreground">
                                            {invoice.number} → {client?.name || "Client"}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Amount</span>
                                        <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Due Date</span>
                                        <span>{formatDate(invoice.dueDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Send via</span>
                                        <span className="capitalize">{channel}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Automation Summary */}
                            {automationEnabled && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-semibold text-amber-800">Automation Enabled</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-amber-700">
                                        <p>• First reminder: {startDaysBefore === 0 ? "On due date" : `${startDaysBefore} days before due`}</p>
                                        <p>• Follow-up every {followUpDays} days</p>
                                        <p>• Max {maxReminders} reminders via {reminderChannels.join(" & ")}</p>
                                        <p>• Tone: {tone}</p>
                                        {autoStopOnPayment && <p>• Auto-stop on payment ✓</p>}
                                    </div>
                                </div>
                            )}

                            {/* Client Warning */}
                            {!client?.email && channel !== "whatsapp" && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm text-rose-700">
                                        ⚠️ Client has no email address. Add email or switch to WhatsApp.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                    {step !== "preview" ? (
                        <Button
                            variant="outline"
                            onClick={() => setStep(step === "confirm" ? "automation" : "preview")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step === "preview" && (
                        <Button onClick={handleProceedToAutomation}>
                            Setup Automation
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}

                    {step === "automation" && (
                        <Button onClick={() => setStep("confirm")}>
                            Review & Send
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}

                    {step === "confirm" && (
                        <Button
                            onClick={handleSend}
                            disabled={isSending || (!client?.email && !capturedEmail && channel !== "whatsapp")}
                            className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90"
                        >
                            {isSending ? (
                                <>Sending...</>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    {automationEnabled ? "Send & Start Automation" : "Send Invoice"}
                                </>
                            )}
                        </Button>
                    )}
                </div>


                {/* Toast */}
                {toast && (
                    <div
                        className={cn(
                            "absolute bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-4",
                            toast.type === "error" ? "bg-rose-500" : "bg-violet-500"
                        )}
                    >
                        {toast.message}
                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
}
