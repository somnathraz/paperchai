
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { useProjects } from "../hooks/useProjects";

export function AutomationPanel({ project }: { project: any }) {
    const { updateProject } = useProjects();
    const [autoInvoice, setAutoInvoice] = useState(project.autoInvoiceEnabled);
    const [autoReminders, setAutoReminders] = useState(project.autoRemindersEnabled);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (field: string, value: boolean) => {
        setLoading(true);
        // Optimistic update
        if (field === 'autoInvoiceEnabled') setAutoInvoice(value);
        if (field === 'autoRemindersEnabled') setAutoReminders(value);

        try {
            await updateProject(project.id, { [field]: value }).unwrap();
            toast.success("Settings updated");
        } catch (error) {
            toast.error("Failed to update settings");
            // Revert
            if (field === 'autoInvoiceEnabled') setAutoInvoice(!value);
            if (field === 'autoRemindersEnabled') setAutoReminders(!value);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    Automation Rules
                    {loading && <RefreshCcw className="h-4 w-4 animate-spin text-slate-400" />}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-base">Auto-generate Draft Invoices</Label>
                        <p className="text-sm text-slate-500">
                            Automatically create invoice drafts when milestones are marked as &apos;Ready for Invoice&apos;.
                        </p>
                    </div>
                    <Switch
                        checked={autoInvoice}
                        onCheckedChange={(checked) => handleUpdate('autoInvoiceEnabled', checked)}
                    />
                </div>

                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-base">Auto-schedule Reminders</Label>
                        <p className="text-sm text-slate-500">
                            Automatically schedule email reminders for invoices generated from this project.
                        </p>
                    </div>
                    <Switch
                        checked={autoReminders}
                        onCheckedChange={(checked) => handleUpdate('autoRemindersEnabled', checked)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
