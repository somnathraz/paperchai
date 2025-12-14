"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Check, ChevronDown, Lock, RefreshCw, Wand2, Info, Maximize2, Loader2, Send
} from "lucide-react";
import Image from "next/image";
import { getThemeHtml } from "@/lib/email-themes";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const THEMES = [
    { id: 'modern', name: 'Modern', color: 'bg-slate-900', description: 'Clean rounded cards', premium: false },
    { id: 'minimal', name: 'Minimal', color: 'bg-slate-100 border-slate-300', description: 'Focus on typography', premium: false },
    { id: 'classic', name: 'Classic', color: 'bg-white border-slate-200', description: 'Traditional letter', premium: false },
    { id: 'noir', name: 'Noir', color: 'bg-black border-slate-800', description: 'Sleek dark mode', premium: true },
] as const;

const DEFAULT_TEMPLATE = {
    slug: "invoice-reminder",
    name: "Invoice Reminder",
    subject: "Friendly reminder · Invoice #{{invoiceId}}",
    body: "Hi {{clientName}},\n\nJust a quick reminder about invoice #{{invoiceId}} ({{amount}}) due on {{dueDate}}. We appreciate your prompt payment.\n\nThank you for your business!",
    theme: "modern" as const,
    brandColor: "#0f172a",
    logoUrl: "",
    usedFor: "reminder"
};

type ThemeType = 'minimal' | 'modern' | 'classic' | 'noir';

interface EmailTemplate {
    id?: string;
    slug: string;
    name: string;
    subject: string;
    body: string;
    theme: string;
    brandColor: string;
    logoUrl?: string;
    usedFor?: string;
}

export function EmailTemplateEditor() {
    const [subject, setSubject] = useState(DEFAULT_TEMPLATE.subject);
    const [body, setBody] = useState(DEFAULT_TEMPLATE.body);
    const [brandColor, setBrandColor] = useState(DEFAULT_TEMPLATE.brandColor);
    const [selectedTheme, setSelectedTheme] = useState<ThemeType>(DEFAULT_TEMPLATE.theme);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [useDefaults, setUseDefaults] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // New states for API integration
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [templateId, setTemplateId] = useState<string | undefined>();

    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const initialLoadRef = useRef(true);

    // Fetch existing template on mount
    const fetchTemplate = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/email-templates");
            if (!res.ok) throw new Error("Failed to fetch templates");

            const data = await res.json();
            const reminderTemplate = data.templates?.find((t: EmailTemplate) => t.slug === "invoice-reminder");

            if (reminderTemplate) {
                setTemplateId(reminderTemplate.id);
                setSubject(reminderTemplate.subject);
                setBody(reminderTemplate.body);
                setSelectedTheme((reminderTemplate.theme as ThemeType) || 'modern');
                setBrandColor(reminderTemplate.brandColor || '#0f172a');
                setLogoUrl(reminderTemplate.logoUrl || '');
                setUseDefaults(!reminderTemplate.logoUrl && reminderTemplate.brandColor === '#0f172a');
            }
        } catch (error) {
            console.error("Error loading template:", error);
            toast.error("Failed to load template");
        } finally {
            setIsLoading(false);
            initialLoadRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchTemplate();
    }, [fetchTemplate]);

    // Track unsaved changes (skip initial load)
    useEffect(() => {
        if (!initialLoadRef.current) {
            setIsDirty(true);
        }
    }, [subject, body, brandColor, selectedTheme, logoUrl, useDefaults]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result as string);
                setUseDefaults(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const insertVariable = (variable: string) => {
        if (bodyRef.current) {
            const start = bodyRef.current.selectionStart;
            const end = bodyRef.current.selectionEnd;
            const text = bodyRef.current.value;
            const newText = text.substring(0, start) + variable + text.substring(end);
            setBody(newText);
            bodyRef.current.focus();
            setTimeout(() => {
                bodyRef.current?.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        }
    };

    const handleAiRewrite = async (tone: string) => {
        setAiLoading(true);
        try {
            const currentContent = body || "Write a friendly invoice reminder email";
            const currentSubject = subject || "Invoice reminder";

            const response = await fetch("/api/ai/generate-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `Rewrite this invoice reminder email to be more ${tone}. Current subject: "${currentSubject}". Current body: "${currentContent}". Generate both a new subject line and body text. Keep all variables like {{clientName}}, {{invoiceId}}, {{amount}}, {{dueDate}} exactly as they are.`,
                    type: "email",
                    tone
                }),
            });

            if (!response.ok) throw new Error("Failed to generate");

            const data = await response.json();
            if (data.body) setBody(data.body);
            if (data.subject) setSubject(data.subject);
            toast.success("Template updated with AI");
        } catch (error) {
            console.error("AI generation error:", error);
            toast.error("Failed to generate content. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/email-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug: "invoice-reminder",
                    name: "Invoice Reminder",
                    subject,
                    body,
                    theme: selectedTheme,
                    brandColor: useDefaults ? '#0f172a' : brandColor,
                    logoUrl: useDefaults ? null : logoUrl,
                    usedFor: "reminder"
                })
            });

            if (!res.ok) throw new Error("Failed to save");

            const data = await res.json();
            setTemplateId(data.template?.id);
            setIsDirty(false);
            toast.success("Template saved successfully");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendTest = async () => {
        setIsSendingTest(true);
        try {
            const res = await fetch("/api/email-templates/send-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject,
                    body,
                    theme: selectedTheme,
                    brandColor: useDefaults ? '#0f172a' : brandColor,
                    logoUrl: useDefaults ? null : logoUrl
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to send test email");
            }

            const data = await res.json();
            toast.success(data.message || "Test email sent!");
        } catch (error) {
            console.error("Send test error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send test email");
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleRestoreDefault = () => {
        setSubject(DEFAULT_TEMPLATE.subject);
        setBody(DEFAULT_TEMPLATE.body);
        setSelectedTheme(DEFAULT_TEMPLATE.theme);
        setBrandColor(DEFAULT_TEMPLATE.brandColor);
        setLogoUrl("");
        setUseDefaults(true);
        toast.info("Template restored to default");
    };

    // Prepare preview data with clearer mock values
    const mockData = {
        clientName: "Rahul Sharma",
        invoiceId: "INV-2024-001",
        amount: "₹12,550",
        dueDate: "12 Dec 2025",
        paymentLink: "#"
    };

    const previewHtml = getThemeHtml(selectedTheme, {
        subject: subject || "Invoice Reminder",
        body: body || DEFAULT_TEMPLATE.body,
        brandColor: useDefaults ? '#0f172a' : brandColor,
        logoUrl: useDefaults ? '' : logoUrl,
        ...mockData
    });

    const renderedSubject = (subject || "Invoice Reminder")
        .replace("{{clientName}}", mockData.clientName)
        .replace("{{invoiceId}}", mockData.invoiceId)
        .replace("{{amount}}", mockData.amount)
        .replace("{{dueDate}}", mockData.dueDate);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoice Reminder Email</h1>
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        Used for: Overdue invoices
                    </span>
                </div>
                <p className="text-muted-foreground">Customize how PaperChai follows up with your clients.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                {/* LEFT COLUMN: Controls */}
                <div className="space-y-6">

                    {/* Theme Card */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="border-b p-6 pb-4">
                            <h3 className="font-semibold leading-none tracking-tight">Theme</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">Choose the visual style of your email layout. This is what your client sees.</p>
                        </div>
                        <div className="p-6 pt-4">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {THEMES.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme.id as ThemeType)}
                                        className={cn(
                                            "group relative flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left transition-all hover:bg-muted/50",
                                            selectedTheme === theme.id
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-transparent bg-muted/20"
                                        )}
                                    >
                                        <div className={cn("h-12 w-full rounded-md shadow-sm transition-transform group-hover:scale-105", theme.color)}></div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-foreground">{theme.name}</span>
                                                {theme.premium && <Lock className="h-3 w-3 text-amber-500" />}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight">{theme.description}</p>
                                        </div>
                                        {selectedTheme === theme.id && (
                                            <div className="absolute right-2 top-2 rounded-full bg-primary text-primary-foreground p-0.5">
                                                <Check className="h-3 w-3" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-4 text-[11px] text-muted-foreground">Applies to all reminder emails for this workspace.</p>
                        </div>
                    </div>

                    {/* Branding Card */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center justify-between border-b p-6 pb-4">
                            <div>
                                <h3 className="font-semibold leading-none tracking-tight">Branding</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">Customize logo and colors.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Use workspace defaults</span>
                                <Switch checked={useDefaults} onCheckedChange={setUseDefaults} />
                            </div>
                        </div>

                        {!useDefaults && (
                            <div className="grid gap-6 p-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-bold text-muted-foreground">
                                            {logoUrl ? <Image src={logoUrl} width={64} height={64} className="h-full w-full rounded-full object-cover" alt="Logo" /> : "PC"}
                                        </div>
                                        <div className="flex-1">
                                            <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                                Upload logo
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            </label>
                                            <p className="mt-1.5 text-[10px] text-muted-foreground">PNG / SVG, 512×512 recommended</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Brand accent</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-9 w-9 overflow-hidden rounded-full border shadow-sm">
                                            <input
                                                type="color"
                                                value={brandColor}
                                                onChange={(e) => setBrandColor(e.target.value)}
                                                className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] cursor-pointer border-none p-0"
                                            />
                                        </div>
                                        <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-mono text-muted-foreground">
                                            {brandColor}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Used for buttons, links and highlights.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Card */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center justify-between border-b p-6 pb-4">
                            <div>
                                <h3 className="font-semibold leading-none tracking-tight">Content</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">The actual message sent to clients.</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10">
                                        {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                                        Rewrite with AI
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[180px]">
                                    <DropdownMenuItem onClick={() => handleAiRewrite("polite")}>Make it more polite</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAiRewrite("firm")}>Make it firmer</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAiRewrite("short")}>Shorten message</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAiRewrite("friendly")}>Make it friendly</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium">Subject</label>
                                    <span className="text-[10px] text-muted-foreground">{subject.length} / 78</span>
                                </div>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g., Friendly reminder · Invoice #{{invoiceId}}"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Body</label>
                                <textarea
                                    ref={bodyRef}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={8}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                                    placeholder={DEFAULT_TEMPLATE.body}
                                />
                                <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                                    <Info className="h-3.5 w-3.5" />
                                    AI will keep all variables like {"{{clientName}}"} as-is.
                                </div>
                            </div>
                        </div>

                        {/* Variables Panel */}
                        <div className="border-t bg-muted/10 p-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dynamic variables</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: "{{clientName}}", label: "Client Name" },
                                    { key: "{{invoiceId}}", label: "Invoice #" },
                                    { key: "{{amount}}", label: "Total Amount" },
                                    { key: "{{dueDate}}", label: "Due Date" },
                                ].map((v) => (
                                    <button
                                        key={v.key}
                                        onClick={() => insertVariable(v.key)}
                                        className="group flex items-center gap-1.5 rounded-full border bg-white pl-2 pr-3 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
                                    >
                                        <code className="text-[10px] text-muted-foreground group-hover:text-primary/70">{v.key}</code>
                                        <span>{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border border-border bg-white/90 p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-center gap-2 px-2">
                            <div className={cn("h-2 w-2 rounded-full", isDirty ? "bg-amber-500" : "bg-emerald-500")}></div>
                            <span className="text-xs font-medium text-muted-foreground">
                                {isDirty ? "Unsaved changes" : "Saved"}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleRestoreDefault}>
                                Restore default
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSendTest}
                                disabled={isSendingTest}
                            >
                                {isSendingTest ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Send test
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save template
                            </Button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Preview */}
                <div className="relative">
                    <EmailPreview
                        previewHtml={previewHtml}
                        subject={renderedSubject}
                        device={previewDevice}
                        onDeviceChange={setPreviewDevice}
                        onExpand={() => setIsPreviewOpen(true)}
                        className="sticky top-6"
                    />
                </div>
            </div>

            {/* Full Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 gap-0">
                    <div className="sr-only">
                        <DialogTitle>Email Template Preview</DialogTitle>
                        <DialogDescription>Preview how your email template will appear to recipients</DialogDescription>
                    </div>
                    <EmailPreview
                        previewHtml={previewHtml}
                        subject={renderedSubject}
                        device={previewDevice}
                        onDeviceChange={setPreviewDevice}
                        className="h-[80vh] border-none shadow-none"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Reusable Preview Component
interface EmailPreviewProps {
    previewHtml: string;
    subject: string;
    device: 'desktop' | 'mobile';
    onDeviceChange: (device: 'desktop' | 'mobile') => void;
    onExpand?: () => void;
    className?: string;
}

function EmailPreview({
    previewHtml,
    subject,
    device,
    onDeviceChange,
    onExpand,
    className
}: EmailPreviewProps) {
    return (
        <div className={cn("flex flex-col rounded-2xl border border-border bg-slate-50 shadow-sm", className)}>
            <div className="flex items-center justify-between border-b bg-white/50 px-4 py-3 backdrop-blur-sm rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">Live Preview</span>
                    {onExpand && (
                        <button
                            onClick={onExpand}
                            className="ml-2 flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-medium text-muted-foreground border shadow-sm hover:text-foreground"
                        >
                            <Maximize2 className="h-3 w-3" />
                            Expand
                        </button>
                    )}
                </div>
                <div className="flex rounded-lg bg-muted/50 p-0.5">
                    <button
                        onClick={() => onDeviceChange('desktop')}
                        className={cn("rounded px-2.5 py-1 text-xs font-medium transition", device === 'desktop' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                        Desktop
                    </button>
                    <button
                        onClick={() => onDeviceChange('mobile')}
                        className={cn("rounded px-2.5 py-1 text-xs font-medium transition", device === 'mobile' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                        Mobile
                    </button>
                </div>
            </div>

            {/* Fake Email Header */}
            <div className="border-b bg-white px-4 py-3 text-xs">
                <div className="flex gap-2 mb-1">
                    <span className="text-muted-foreground w-12 text-right">From:</span>
                    <span className="font-medium text-foreground">you@paperchai.app</span>
                </div>
                <div className="flex gap-2 mb-1">
                    <span className="text-muted-foreground w-12 text-right">To:</span>
                    <span className="font-medium text-foreground">client@example.com</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-muted-foreground w-12 text-right">Subject:</span>
                    <span className="font-medium text-foreground truncate">{subject}</span>
                </div>
            </div>

            <div className="flex flex-1 items-center justify-center p-8 min-h-[400px] overflow-hidden bg-slate-100/50">
                <div
                    className={cn(
                        "transition-all duration-300 ease-in-out bg-white shadow-xl overflow-hidden",
                        device === 'mobile' ? "w-[320px] h-[580px] rounded-[24px] border-[6px] border-slate-800" : "w-full h-full rounded-lg border border-border/20"
                    )}
                >
                    <iframe
                        title="Email Preview"
                        srcDoc={previewHtml}
                        className="h-full w-full bg-white"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}
