"use client";

import { useState } from "react";
import { Info, Zap, Save, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { InvoiceFormState } from "../../invoice-form";

type TaxSectionProps = {
    formState: InvoiceFormState;
    onFormStateChange: (state: InvoiceFormState) => void;
    clientRegion?: { region: string; taxRate: number } | null;
    hasClientSelected?: boolean;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {title}
                </p>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

export function TaxSection({ formState, onFormStateChange, clientRegion, hasClientSelected = false }: TaxSectionProps) {
    const updateField = <K extends keyof InvoiceFormState>(
        field: K,
        value: InvoiceFormState[K]
    ) => {
        onFormStateChange({ ...formState, [field]: value });
    };

    const taxSettings = formState.taxSettings || { inclusive: false, automatic: false };

    const updateTaxSettings = (patch: Partial<typeof taxSettings>) => {
        updateField("taxSettings", { ...taxSettings, ...patch });
    };

    // Apply default tax rate to all items
    const applyDefaultTaxRate = (rate: number) => {
        const newItems = formState.items.map((item) => ({
            ...item,
            taxRate: rate,
        }));
        updateField("items", newItems);
    };

    // Check if items have mixed tax rates
    const hasMixedTaxRates = () => {
        const rates = new Set(formState.items.map((item) => item.taxRate || 0));
        return rates.size > 1;
    };

    // Get current effective tax rate
    const currentTaxRate = formState.items[0]?.taxRate || taxSettings.defaultRate || 0;

    // Show manual tax region selector only when no client is selected
    const showManualTaxRegion = !hasClientSelected;

    // Save as default state
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const saveAsDefault = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    defaultTaxRate: taxSettings.defaultRate || currentTaxRate,
                    taxInclusive: taxSettings.inclusive,
                }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionCard title="Tax Preferences">
                {/* Inclusive Tax Toggle */}
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-muted/20 p-3">
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">Prices include tax</Label>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            When enabled, entered prices are treated as tax-inclusive.
                            Tax will be extracted from the price rather than added.
                        </p>
                    </div>
                    <Switch
                        checked={taxSettings.inclusive}
                        onCheckedChange={(checked) => updateTaxSettings({ inclusive: checked })}
                    />
                </div>

                {/* Automatic Tax Toggle - Only show when client is selected */}
                {hasClientSelected && (
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-muted/20 p-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Auto-detect tax from client</Label>
                                <Badge variant="secondary" className="text-[10px]">
                                    <Zap className="h-2.5 w-2.5 mr-1" />
                                    Smart
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Automatically suggest tax rate based on client location.
                                {clientRegion && (
                                    <span className="block mt-1 text-emerald-600">
                                        Detected: {clientRegion.region} → {clientRegion.taxRate}%
                                    </span>
                                )}
                            </p>
                        </div>
                        <Switch
                            checked={taxSettings.automatic}
                            onCheckedChange={(checked) => {
                                updateTaxSettings({ automatic: checked });
                                // Apply suggested rate when enabling
                                if (checked && clientRegion) {
                                    updateTaxSettings({ automatic: checked, defaultRate: clientRegion.taxRate });
                                    applyDefaultTaxRate(clientRegion.taxRate);
                                }
                            }}
                        />
                    </div>
                )}

                {/* Tax Rate Indicator */}
                {taxSettings.inclusive && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                        <Info className="h-4 w-4 text-amber-600" />
                        <p className="text-[11px] text-amber-700">
                            <strong>Tax-inclusive mode:</strong> ₹118 at 18% means ₹100 base + ₹18 tax
                        </p>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Tax Rate">
                <div>
                    <Label className="text-xs font-medium text-muted-foreground">Tax Rate</Label>
                    <div className="flex gap-2 mt-2">
                        <Select
                            value={String(taxSettings.defaultRate ?? currentTaxRate ?? 0)}
                            onValueChange={(v) => {
                                const rate = parseFloat(v) || 0;
                                updateTaxSettings({ defaultRate: rate });
                                if (!hasMixedTaxRates()) {
                                    applyDefaultTaxRate(rate);
                                }
                            }}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue>
                                    {(() => {
                                        const rate = taxSettings.defaultRate ?? currentTaxRate ?? 0;
                                        const labels: Record<number, string> = {
                                            0: "No tax",
                                            5: "🇮🇳 GST 5%",
                                            12: "🇮🇳 GST 12%",
                                            18: "🇮🇳 GST 18%",
                                            28: "🇮🇳 GST 28%",
                                            20: "🇬🇧 VAT 20%",
                                            21: "🇪🇺 VAT 21%",
                                            19: "🇩🇪 VAT 19%",
                                            10: "🇦🇺 GST 10%",
                                            15: "🇳🇿 GST 15%",
                                            13: "🇨🇦 HST 13%",
                                            7: "🇸🇬 GST 7%",
                                        };
                                        return labels[rate] || `${rate}%`;
                                    })()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">No tax</SelectItem>
                                <SelectItem value="5">🇮🇳 GST 5%</SelectItem>
                                <SelectItem value="12">🇮🇳 GST 12%</SelectItem>
                                <SelectItem value="18">🇮🇳 GST 18%</SelectItem>
                                <SelectItem value="28">🇮🇳 GST 28%</SelectItem>
                                <SelectItem value="20">🇬🇧 VAT 20%</SelectItem>
                                <SelectItem value="21">🇪🇺 VAT 21%</SelectItem>
                                <SelectItem value="19">🇩🇪 VAT 19%</SelectItem>
                                <SelectItem value="10">🇦🇺 GST 10%</SelectItem>
                                <SelectItem value="15">🇳🇿 GST 15%</SelectItem>
                                <SelectItem value="13">🇨🇦 HST 13%</SelectItem>
                                <SelectItem value="7">🇸🇬 GST 7%</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                value={taxSettings.defaultRate || currentTaxRate || ""}
                                onChange={(e) => {
                                    const rate = parseFloat(e.target.value) || 0;
                                    updateTaxSettings({ defaultRate: rate });
                                    if (!hasMixedTaxRates()) {
                                        applyDefaultTaxRate(rate);
                                    }
                                }}
                                placeholder="Custom"
                                className="w-20 h-10 text-center"
                                min="0"
                                max="100"
                                step="0.5"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                        </div>
                    </div>

                    {(hasMixedTaxRates() || formState.items.some(item => (item.taxRate || 0) !== (taxSettings.defaultRate || 0))) && (
                        <div className="flex items-center justify-between mt-2 text-[11px]">
                            <span className="text-muted-foreground">
                                {hasMixedTaxRates() ? "Items have mixed tax rates" : "Items do not match default rate"}
                            </span>
                            <button
                                onClick={() => applyDefaultTaxRate(taxSettings.defaultRate || 0)}
                                className="text-primary hover:underline"
                            >
                                Apply {taxSettings.defaultRate || 0}% to all
                            </button>
                        </div>
                    )}

                    {/* Save as Default Button */}
                    <div className="pt-3 border-t border-border/30 mt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={saveAsDefault}
                            disabled={saving}
                        >
                            {saved ? (
                                <><Check className="h-3 w-3 mr-1.5 text-emerald-600" /> Saved!</>
                            ) : saving ? (
                                "Saving..."
                            ) : (
                                <><Save className="h-3 w-3 mr-1.5" /> Save as default</>
                            )}
                        </Button>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Tax Breakdown">
                <div className="space-y-2 text-sm">
                    {/* Group items by tax rate */}
                    {Array.from(
                        new Set(formState.items.map((item) => item.taxRate || 0))
                    )
                        .sort((a, b) => b - a)
                        .map((rate) => {
                            const itemsAtRate = formState.items.filter((item) => (item.taxRate || 0) === rate);
                            const baseTotal = itemsAtRate.reduce(
                                (sum, item) => {
                                    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                                    if (taxSettings.inclusive && rate > 0) {
                                        return sum + lineTotal / (1 + rate / 100);
                                    }
                                    return sum + lineTotal;
                                },
                                0
                            );
                            const taxAmount = itemsAtRate.reduce(
                                (sum, item) => {
                                    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                                    if (taxSettings.inclusive && rate > 0) {
                                        return sum + (lineTotal - lineTotal / (1 + rate / 100));
                                    }
                                    return sum + (lineTotal * rate) / 100;
                                },
                                0
                            );

                            if (rate === 0) return null;

                            return (
                                <div key={rate} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                                    <span className="text-muted-foreground">
                                        Tax @ {rate}%
                                        <span className="text-[10px] ml-1">
                                            ({itemsAtRate.length} item{itemsAtRate.length > 1 ? "s" : ""})
                                        </span>
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        ₹{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            );
                        })}

                    {formState.items.every((item) => !item.taxRate || item.taxRate === 0) && (
                        <p className="text-muted-foreground text-center py-2">
                            No tax applied to items
                        </p>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}
