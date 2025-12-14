"use client";

import { InvoiceFormState } from "../../invoice-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

type BrandingTabProps = {
    formState: InvoiceFormState;
    onFormStateChange: (state: InvoiceFormState) => void;
    updateField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
};

type SectionCardProps = {
    title: string;
    children: React.ReactNode;
};

function SectionCard({ title, children }: SectionCardProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

const BRAND_PRESETS = [
    { name: "Emerald", font: "Inter", primary: "#10b981", accent: "#0f172a", bg: "#ffffff", isPro: false },
    { name: "Slate Pro", font: "Manrope", primary: "#0f172a", accent: "#334155", bg: "#f8fafc", isPro: false },
    { name: "Sunrise", font: "Poppins", primary: "#f97316", accent: "#0f172a", bg: "#fff7ed", isPro: false },
    { name: "Ocean Blue", font: "Inter", primary: "#0ea5e9", accent: "#0c4a6e", bg: "#f0f9ff", isPro: false },
    { name: "Lavender", font: "DM Sans", primary: "#8b5cf6", accent: "#4c1d95", bg: "#faf5ff", isPro: true },
    { name: "Rose Gold", font: "Sora", primary: "#f43f5e", accent: "#881337", bg: "#fff1f2", isPro: true },
    { name: "Midnight", font: "Manrope", primary: "#6366f1", accent: "#1e1b4b", bg: "#eef2ff", isPro: true },
    { name: "Forest", font: "Poppins", primary: "#059669", accent: "#064e3b", bg: "#ecfdf5", isPro: true },
];

const FONT_FAMILIES = [
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Source Sans Pro",
    "Slabo 27px", "Raleway", "PT Sans", "Merriweather", "Nunito", "Playfair Display",
    "Rubik", "Poppins", "Work Sans", "Fira Sans", "Manrope", "DM Sans", "Sora", "Space Grotesk"
].sort();

const TYPOGRAPHY_SECTIONS = [
    { id: "header", label: "Header" },
    { id: "client", label: "Client" },
    { id: "items", label: "Items" },
    { id: "total", label: "Total" },
    { id: "footer", label: "Footer" },
];

const FONT_SIZES = ["12px", "13px", "14px", "15px", "16px", "18px", "20px", "22px", "24px", "28px", "32px"];

const PRIMARY_COLORS = ["#10b981", "#0ea5e9", "#f97316", "#6366f1", "#8b5cf6", "#f43f5e", "#059669", "#0f172a"];
const ACCENT_COLORS = ["#0f172a", "#1e293b", "#334155", "#475569", "#0c4a6e", "#1e1b4b", "#4c1d95", "#881337"];

export function BrandingTab({ formState, onFormStateChange, updateField }: BrandingTabProps) {
    return (
        <div className="space-y-4">
            {/* Brand Presets */}
            <SectionCard title="Brand Presets">
                <p className="text-[11px] text-muted-foreground mb-3">
                    Choose a preset to quickly style your invoice. Click to apply.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {BRAND_PRESETS.map((preset) => {
                        const isSelected = formState.primaryColor === preset.primary && formState.fontFamily === preset.font;
                        return (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() =>
                                    onFormStateChange({
                                        ...formState,
                                        fontFamily: preset.font,
                                        primaryColor: preset.primary,
                                        accentColor: preset.accent,
                                        backgroundColor: preset.bg,
                                    })
                                }
                                className={cn(
                                    "relative flex flex-col items-start rounded-lg border p-3 text-left transition-all hover:shadow-md",
                                    isSelected
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-border/60 hover:border-primary/40"
                                )}
                            >
                                {preset.isPro && (
                                    <span className="absolute top-1.5 right-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                        PRO
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="h-5 w-5 rounded-full border border-white shadow-sm"
                                        style={{ backgroundColor: preset.primary }}
                                    />
                                    <div
                                        className="h-3 w-3 rounded-full border border-white shadow-sm -ml-3"
                                        style={{ backgroundColor: preset.accent }}
                                    />
                                </div>
                                <span className="text-xs font-medium" style={{ color: preset.primary }}>
                                    {preset.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{preset.font}</span>
                                {/* Mini preview */}
                                <div
                                    className="mt-2 w-full h-8 rounded border"
                                    style={{
                                        backgroundColor: preset.bg,
                                        borderColor: preset.primary + "30",
                                    }}
                                >
                                    <div
                                        className="h-2 w-3/4 rounded-sm mt-1.5 ml-1.5"
                                        style={{ backgroundColor: preset.primary }}
                                    />
                                    <div
                                        className="h-1.5 w-1/2 rounded-sm mt-1 ml-1.5"
                                        style={{ backgroundColor: preset.accent + "40" }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SectionCard>

            {/* Font Family */}
            <SectionCard title="Font Family">
                <Select
                    value={formState.fontFamily || "Inter"}
                    onValueChange={(v) => updateField("fontFamily", v)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select font family" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                {font}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-2">
                    Select a font for your invoice typography.
                </p>
            </SectionCard>

            {/* Typography Details */}
            <SectionCard title="Typography Details">
                <div className="space-y-3">
                    {TYPOGRAPHY_SECTIONS.map((section) => (
                        <div key={section.id} className="grid grid-cols-[1fr_0.8fr_0.8fr] gap-2 items-center">
                            <span className="text-xs font-medium text-muted-foreground">{section.label}</span>
                            <Select
                                value={formState.typography?.[section.id]?.size}
                                onValueChange={(v) => {
                                    const current = formState.typography || {};
                                    onFormStateChange({
                                        ...formState,
                                        typography: {
                                            ...current,
                                            [section.id]: { ...current[section.id], size: v }
                                        }
                                    });
                                }}
                            >
                                <SelectTrigger className="h-7 text-[11px] px-2"><SelectValue placeholder="Size" /></SelectTrigger>
                                <SelectContent>
                                    {FONT_SIZES.map(s => (
                                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={formState.typography?.[section.id]?.weight}
                                onValueChange={(v) => {
                                    const current = formState.typography || {};
                                    onFormStateChange({
                                        ...formState,
                                        typography: {
                                            ...current,
                                            [section.id]: { ...current[section.id], weight: v }
                                        }
                                    });
                                }}
                            >
                                <SelectTrigger className="h-7 text-[11px] px-2"><SelectValue placeholder=" Wgt" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="300" className="text-xs">Light</SelectItem>
                                    <SelectItem value="400" className="text-xs">Regular</SelectItem>
                                    <SelectItem value="500" className="text-xs">Medium</SelectItem>
                                    <SelectItem value="600" className="text-xs">SemiBold</SelectItem>
                                    <SelectItem value="700" className="text-xs">Bold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Colors */}
            <SectionCard title="Colors">
                <div className="space-y-4">
                    {/* Primary Color */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Primary color</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {PRIMARY_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => updateField("primaryColor", c)}
                                    className={cn(
                                        "h-7 w-7 rounded-lg border-2 transition-all hover:scale-110",
                                        formState.primaryColor === c ? "border-foreground ring-2 ring-offset-2 ring-primary/30" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <Input
                                type="color"
                                value={formState.primaryColor || "#10b981"}
                                onChange={(e) => updateField("primaryColor", e.target.value)}
                                className="h-9 w-12 p-1 cursor-pointer"
                            />
                            <Input
                                value={formState.primaryColor || "#10b981"}
                                onChange={(e) => updateField("primaryColor", e.target.value)}
                                className="h-9 flex-1 font-mono text-xs"
                                placeholder="#10b981"
                            />
                        </div>
                    </div>

                    {/* Accent Color */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Accent / Text color</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => updateField("accentColor", c)}
                                    className={cn(
                                        "h-7 w-7 rounded-lg border-2 transition-all hover:scale-110",
                                        formState.accentColor === c ? "border-foreground ring-2 ring-offset-2 ring-primary/30" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <Input
                                type="color"
                                value={formState.accentColor || "#0f172a"}
                                onChange={(e) => updateField("accentColor", e.target.value)}
                                className="h-9 w-12 p-1 cursor-pointer"
                            />
                            <Input
                                value={formState.accentColor || "#0f172a"}
                                onChange={(e) => updateField("accentColor", e.target.value)}
                                className="h-9 flex-1 font-mono text-xs"
                                placeholder="#0f172a"
                            />
                        </div>
                    </div>

                    {/* Background */}
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Background style</Label>
                        <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" className="flex-1">Solid</Button>
                            <Button variant="outline" size="sm" className="flex-1" disabled>Gradient (Pro)</Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                type="color"
                                value={formState.backgroundColor || "#ffffff"}
                                onChange={(e) => updateField("backgroundColor", e.target.value)}
                                className="h-8 w-16 p-1"
                            />
                            <Input
                                value={formState.backgroundColor || "#ffffff"}
                                onChange={(e) => updateField("backgroundColor", e.target.value)}
                                className="h-8 flex-1"
                                placeholder="#ffffff"
                            />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Logo & Signature */}
            <SectionCard title="Logo & Signature">
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Logo URL</Label>
                        <Input
                            value={formState.logoUrl || ""}
                            onChange={(e) => updateField("logoUrl", e.target.value)}
                            placeholder="https://..."
                            className="mt-2"
                        />
                        {formState.logoUrl && (
                            <div className="mt-2 h-12 w-12 rounded border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formState.logoUrl} alt="Logo" className="h-full w-full object-contain rounded" />
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <Switch defaultChecked />
                            <Label className="text-[11px]">Show logo on invoice</Label>
                        </div>

                        <div className="mt-4 space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Logo Size</Label>
                                    <span className="text-[10px] text-muted-foreground">{formState.logoSettings?.width || 48}px</span>
                                </div>
                                <Slider
                                    value={[formState.logoSettings?.width || 48]}
                                    onValueChange={(v) =>
                                        onFormStateChange({
                                            ...formState,
                                            logoSettings: { ...formState.logoSettings, width: v[0], height: v[0] },
                                        })
                                    }
                                    min={24}
                                    max={120}
                                    step={4}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Signature URL</Label>
                        <Input
                            value={formState.signatureUrl || ""}
                            onChange={(e) => updateField("signatureUrl", e.target.value)}
                            placeholder="https://..."
                            className="mt-2"
                        />
                        {formState.signatureUrl && (
                            <div className="mt-2 h-16 w-32 rounded border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formState.signatureUrl} alt="Signature" className="h-full w-full object-contain rounded" />
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* Layout Options */}
            <SectionCard title="Layout Options">
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Layout Density</Label>
                        <Select
                            value={formState.layoutDensity || "cozy"}
                            onValueChange={(v) => updateField("layoutDensity", v as "cozy" | "compact" | "statement")}
                        >
                            <SelectTrigger className="w-full mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="cozy">Cozy</SelectItem>
                                <SelectItem value="statement">Statement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">Show Border</Label>
                        <Switch
                            checked={formState.showBorder}
                            onCheckedChange={(checked) => updateField("showBorder", checked)}
                        />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}
