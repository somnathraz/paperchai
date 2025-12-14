"use client";

import { InvoiceFormState } from "../../invoice-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type SettingsTabProps = {
    formState: InvoiceFormState;
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

export function SettingsTab({ formState, updateField }: SettingsTabProps) {
    return (
        <div className="space-y-4">
            {/* Layout Style */}
            <SectionCard title="Layout Style">
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">Layout density</Label>
                        <Select
                            value={formState.layoutDensity || "cozy"}
                            onValueChange={(v) => updateField("layoutDensity", v as "cozy" | "compact" | "statement")}
                        >
                            <SelectTrigger className="w-full mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cozy">Cozy</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="statement">Statement (bigger typography)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show invoice border</Label>
                        <Switch
                            checked={formState.showBorder ?? false}
                            onCheckedChange={(c) => updateField("showBorder", c)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show subtle background pattern</Label>
                        <div className="flex items-center gap-2">
                            <Switch disabled />
                            <Badge variant="outline" className="text-[10px]">Pro</Badge>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Future: Section Visibility & Reordering */}
            {/* This can be added when section management features are implemented */}
        </div>
    );
}
