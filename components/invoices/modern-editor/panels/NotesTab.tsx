"use client";

import { InvoiceFormState } from "../../invoice-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type NotesTabProps = {
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

const NOTE_PRESETS = [
    { label: "Thank you note", text: "Thank you for your business!" },
    { label: "Friendly reminder about late fee", text: "Please note that late fees may apply after the due date." },
    { label: "Project-specific note", text: "This invoice is for the project work completed." },
];

export function NotesTab({ formState, updateField }: NotesTabProps) {
    const handlePresetClick = (presetText: string) => {
        const currentNotes = formState.notes || "";
        const newNotes = currentNotes + (currentNotes ? "\n\n" : "") + presetText;
        updateField("notes", newNotes);
    };

    return (
        <div className="space-y-4">
            {/* Notes */}
            <SectionCard title="Notes">
                <div className="flex flex-wrap gap-2 mb-3">
                    {NOTE_PRESETS.map((preset) => (
                        <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => handlePresetClick(preset.text)}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>
                <Textarea
                    value={formState.notes || ""}
                    onChange={(e) => updateField("notes", e.target.value || undefined)}
                    rows={4}
                    placeholder="Additional notes..."
                />
            </SectionCard>

            {/* Payment Terms */}
            <SectionCard title="Payment Terms">
                <Select
                    value={
                        formState.terms?.includes("Net 7")
                            ? "net7"
                            : formState.terms?.includes("Net 15")
                                ? "net15"
                                : formState.terms?.includes("Net 30")
                                    ? "net30"
                                    : "custom"
                    }
                    onValueChange={(v) => {
                        if (v === "net7") updateField("terms", "Net 7 days");
                        else if (v === "net15") updateField("terms", "Net 15 days");
                        else if (v === "net30") updateField("terms", "Net 30 days");
                        else updateField("terms", formState.terms || "");
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="net7">Net 7</SelectItem>
                        <SelectItem value="net15">Net 15</SelectItem>
                        <SelectItem value="net30">Net 30</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>
                {formState.terms &&
                    formState.terms !== "Net 7 days" &&
                    formState.terms !== "Net 15 days" &&
                    formState.terms !== "Net 30 days" && (
                        <Textarea
                            value={formState.terms}
                            onChange={(e) => updateField("terms", e.target.value)}
                            rows={2}
                            className="mt-2"
                            placeholder="Custom terms..."
                        />
                    )}
            </SectionCard>
        </div>
    );
}
