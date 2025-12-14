"use client";

import { InvoiceFormState } from "../../invoice-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type RemindersTabProps = {
    formState: InvoiceFormState;
    updateField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
};

const DEFAULT_REMINDER_SCHEDULE = {
    useDefaults: true,
    steps: [
        { index: 0, daysBeforeDue: 3, label: "Gentle Reminder", templateSlug: "reminder-gentle", notifyCreator: false },
        { index: 1, daysAfterDue: 1, label: "Due Reminder", templateSlug: "reminder-standard", notifyCreator: true },
        { index: 2, daysAfterDue: 7, label: "Overdue Warning", templateSlug: "reminder-assertive", notifyCreator: true },
    ],
};

export function RemindersTab({ formState, updateField }: RemindersTabProps) {
    const handleEnableReminders = (checked: boolean) => {
        updateField("remindersEnabled", checked);
        if (checked && !formState.reminderSchedule) {
            updateField("reminderSchedule", DEFAULT_REMINDER_SCHEDULE);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Enable automatic reminders</Label>
                <Switch checked={!!formState.remindersEnabled} onCheckedChange={handleEnableReminders} />
            </div>

            {formState.remindersEnabled && formState.reminderSchedule && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                        <div className="flex flex-col">
                            <Label className="text-xs font-medium">Use workspace defaults</Label>
                            <span className="text-[10px] text-muted-foreground">Updates automatically if settings change</span>
                        </div>
                        <Switch
                            checked={formState.reminderSchedule.useDefaults}
                            onCheckedChange={(checked) =>
                                updateField("reminderSchedule", {
                                    ...formState.reminderSchedule!,
                                    useDefaults: checked,
                                })
                            }
                        />
                    </div>

                    <div className="space-y-3 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border/60" />

                        {formState.reminderSchedule.steps.map((step, idx) => (
                            <div key={idx} className="relative pl-8">
                                <div className="absolute left-2 top-2 h-3 w-3 rounded-full border-2 border-primary bg-white z-10 box-content" />
                                <div
                                    className={cn(
                                        "rounded-lg border border-border/60 bg-white p-3 space-y-2 transition-all",
                                        formState.reminderSchedule?.useDefaults ? "opacity-80 pointer-events-none grayscale-[0.5]" : ""
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {step.daysBeforeDue
                                                ? `${step.daysBeforeDue} days before due`
                                                : step.daysAfterDue
                                                    ? `${step.daysAfterDue} days overdue`
                                                    : "On due date"}
                                        </Label>
                                        {step.notifyCreator && (
                                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                Notify me
                                            </Badge>
                                        )}
                                    </div>

                                    {!formState.reminderSchedule?.useDefaults ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground">Send</Label>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Input
                                                        type="number"
                                                        className="h-7 text-xs"
                                                        value={step.daysBeforeDue || step.daysAfterDue || 0}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newSteps = [...formState.reminderSchedule!.steps];
                                                            if (step.daysBeforeDue !== undefined && step.daysBeforeDue !== null)
                                                                newSteps[idx].daysBeforeDue = val;
                                                            else newSteps[idx].daysAfterDue = val;
                                                            updateField("reminderSchedule", { ...formState.reminderSchedule!, steps: newSteps });
                                                        }}
                                                    />
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {step.daysBeforeDue ? "days before" : "days after"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground">Template</Label>
                                                <Select
                                                    value={step.templateSlug || "reminder-standard"}
                                                    onValueChange={(v) => {
                                                        const newSteps = [...formState.reminderSchedule!.steps];
                                                        newSteps[idx].templateSlug = v;
                                                        updateField("reminderSchedule", { ...formState.reminderSchedule!, steps: newSteps });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-7 text-xs mt-1">
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
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            <span>{step.label || step.templateSlug?.replace("reminder-", "") || "Standard"} email</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {!formState.reminderSchedule.useDefaults && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8 dashed border-border/60 text-muted-foreground"
                        >
                            Add Step (Coming Soon)
                        </Button>
                    )}
                </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-4">
                {formState.remindersEnabled
                    ? "Reminders will be sent automatically based on the schedule above."
                    : "Enable reminders to chase payments automatically."}
            </p>
        </div>
    );
}
