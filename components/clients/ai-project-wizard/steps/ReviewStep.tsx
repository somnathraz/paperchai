"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    ChevronRight,
    Plus,
    Trash2,
    Wand2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedData } from "../types";

interface ReviewStepProps {
    data: ExtractedData;
    setData: (data: ExtractedData) => void;
    validationErrors: string[];
    onBack: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export function ReviewStep({
    data,
    setData,
    validationErrors,
    onBack,
    onConfirm,
    onCancel,
    isSaving,
}: ReviewStepProps) {
    const totalMilestoneAmount = data.milestones.reduce(
        (acc, m) => acc + (m.amount || 0),
        0
    );
    const budgetUtilization =
        (totalMilestoneAmount / (data.project.totalBudget || 1)) * 100;
    const isBudgetExceeded =
        totalMilestoneAmount > data.project.totalBudget + 100;

    const handleAddMilestone = () => {
        setData({
            ...data,
            milestones: [
                ...data.milestones,
                {
                    title: "",
                    amount: 0,
                    status: "PLANNED",
                    billingTrigger: "ON_COMPLETION",
                },
            ],
        });
    };

    const handleRemoveMilestone = (idx: number) => {
        const newMilestones = [...data.milestones];
        newMilestones.splice(idx, 1);
        setData({ ...data, milestones: newMilestones });
    };

    const updateMilestone = (idx: number, field: string, value: any) => {
        const m = [...data.milestones];
        (m[idx] as any)[field] = value;
        setData({ ...data, milestones: m });
    };

    const updateClient = (field: string, value: string) => {
        setData({ ...data, client: { ...data.client, [field]: value } });
    };

    const updateProject = (field: string, value: any) => {
        setData({ ...data, project: { ...data.project, [field]: value } });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] -m-6 bg-slate-50/50">
            {/* 1. Top Banner: AI Context */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-white shadow-sm border border-blue-100 rounded-lg text-blue-600 shrink-0">
                        <Wand2 className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900">
                                AI Analysis Complete
                            </h3>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "border-0 font-medium",
                                    data.confidence.project > 0.7
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                )}
                            >
                                {(data.confidence.project * 100).toFixed(0)}% Confidence
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                            We&apos;ve extracted the details below from your document. Please
                            review accuracy before starting the project automation.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-rose-600"
                        onClick={onBack}
                    >
                        Start Over
                    </Button>
                </div>
            </div>

            {/* 2. Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Validation Alerts */}
                    {validationErrors.length > 0 && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-2 font-semibold text-rose-800 text-sm">
                                <AlertCircle className="h-4 w-4" /> Please fix the following
                                before saving:
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {validationErrors.map((err, i) => (
                                    <li key={i} className="text-xs text-rose-700 font-medium ml-2">
                                        {err}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Client & Project (Col 7) */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Card 1: Client Details */}
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            1
                                        </div>
                                        Client Details
                                    </h4>
                                </div>
                                <CardContent className="p-6 grid gap-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Client Name
                                            </Label>
                                            <Input
                                                value={data.client.name}
                                                onChange={(e) => updateClient("name", e.target.value)}
                                                className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                                placeholder="e.g. Acme Corp"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Email Address
                                            </Label>
                                            <Input
                                                value={data.client.email}
                                                onChange={(e) => updateClient("email", e.target.value)}
                                                className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                                placeholder="contact@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Company / Entity
                                        </Label>
                                        <Input
                                            value={data.client.company}
                                            onChange={(e) => updateClient("company", e.target.value)}
                                            className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                            placeholder="Legal entity name"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 2: Project Scope */}
                            <Card className="shadow-sm border-slate-200 overflow-hidden">
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            2
                                        </div>
                                        Project Scope
                                    </h4>
                                </div>
                                <CardContent className="p-6 grid gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Project Name
                                            </Label>
                                            <Input
                                                value={data.project.name}
                                                onChange={(e) => updateProject("name", e.target.value)}
                                                className="h-10 border-slate-200 font-medium text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20"
                                                placeholder="Project Title"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Description
                                            </Label>
                                            <Textarea
                                                value={data.project.description || ""}
                                                onChange={(e) =>
                                                    updateProject("description", e.target.value)
                                                }
                                                className="min-h-[80px] border-slate-200 resize-y focus:border-indigo-500 focus:ring-indigo-500/20"
                                                placeholder="Brief scope of work..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Start Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={data.project.startDate || ""}
                                                onChange={(e) =>
                                                    updateProject("startDate", e.target.value)
                                                }
                                                className="h-10 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                End Date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={data.project.endDate || ""}
                                                onChange={(e) =>
                                                    updateProject("endDate", e.target.value)
                                                }
                                                className="h-10 border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 my-2" />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Type
                                            </Label>
                                            <Select
                                                value={data.project.type}
                                                onValueChange={(v) => updateProject("type", v)}
                                            >
                                                <SelectTrigger className="h-10 border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="FIXED">Fixed Price</SelectItem>
                                                    <SelectItem value="MILESTONE">
                                                        Milestone Based
                                                    </SelectItem>
                                                    <SelectItem value="HOURLY">Hourly</SelectItem>
                                                    <SelectItem value="RETAINER">Retainer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Billing
                                            </Label>
                                            <Select
                                                value={data.project.billingStrategy}
                                                onValueChange={(v) =>
                                                    updateProject("billingStrategy", v)
                                                }
                                            >
                                                <SelectTrigger className="h-10 border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SINGLE_INVOICE">
                                                        Single Invoice
                                                    </SelectItem>
                                                    <SelectItem value="PER_MILESTONE">
                                                        Per Milestone
                                                    </SelectItem>
                                                    <SelectItem value="RETAINER_MONTHLY">
                                                        Monthly
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Total Budget
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-bold">
                                                    {data.project.currency}
                                                </span>
                                                <Input
                                                    type="number"
                                                    value={data.project.totalBudget / 100}
                                                    onChange={(e) =>
                                                        updateProject(
                                                            "totalBudget",
                                                            parseFloat(e.target.value) * 100
                                                        )
                                                    }
                                                    className="pl-10 h-10 border-slate-200 font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Milestones & Automation (Col 5) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Card 3: Milestones */}
                            <Card className="shadow-sm border-slate-200 overflow-hidden flex flex-col h-full max-h-[600px]">
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            3
                                        </div>
                                        Milestones
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                        onClick={handleAddMilestone}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                </div>

                                {/* Scrollable List */}
                                <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50/30">
                                    {data.milestones.length === 0 && (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            No milestones detected. <br /> Add one manually.
                                        </div>
                                    )}
                                    {data.milestones.map((milestone, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all p-4"
                                        >
                                            <button
                                                onClick={() => handleRemoveMilestone(idx)}
                                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>

                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <Input
                                                        value={milestone.title}
                                                        onChange={(e) =>
                                                            updateMilestone(idx, "title", e.target.value)
                                                        }
                                                        className="h-8 border-transparent hover:border-slate-200 focus:border-indigo-500 px-0 font-medium text-slate-900 placeholder:text-slate-400"
                                                        placeholder="Milestone Title"
                                                    />
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-28">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                                                {data.project.currency}
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                value={milestone.amount / 100}
                                                                onChange={(e) =>
                                                                    updateMilestone(
                                                                        idx,
                                                                        "amount",
                                                                        parseFloat(e.target.value) * 100
                                                                    )
                                                                }
                                                                className="h-8 pl-8 border-slate-100 bg-slate-50 text-right text-xs font-mono"
                                                            />
                                                        </div>
                                                        <Input
                                                            type="date"
                                                            value={milestone.dueDate || ""}
                                                            onChange={(e) =>
                                                                updateMilestone(idx, "dueDate", e.target.value)
                                                            }
                                                            className="h-8 w-40 text-xs border-slate-100 bg-slate-50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Running Total Footer */}
                                <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="text-xs font-medium text-slate-500">
                                            Budget Utilization
                                        </div>
                                        <div
                                            className={cn(
                                                "text-sm font-bold font-mono",
                                                isBudgetExceeded ? "text-rose-600" : "text-slate-900"
                                            )}
                                        >
                                            {data.project.currency}{" "}
                                            {(totalMilestoneAmount / 100).toLocaleString()}
                                            <span className="text-slate-400 font-normal ml-1">
                                                / {(data.project.totalBudget / 100).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                isBudgetExceeded ? "bg-rose-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                                        />
                                    </div>
                                    {isBudgetExceeded && (
                                        <p className="text-[10px] text-rose-600 mt-1 font-medium">
                                            Warning: Milestones exceed total budget.
                                        </p>
                                    )}
                                </div>
                            </Card>

                            {/* Card 4: Automation */}
                            <Card className="shadow-sm border-emerald-100 bg-emerald-50/20 overflow-hidden">
                                <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
                                    <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                            4
                                        </div>
                                        Automation
                                    </h4>
                                </div>
                                <CardContent className="p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-medium text-slate-900">
                                                Auto-Draft Invoices
                                            </Label>
                                            <p className="text-xs text-slate-500">
                                                Generate draft when milestone is ready.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={data.project.autoInvoiceEnabled}
                                            onCheckedChange={(c) =>
                                                updateProject("autoInvoiceEnabled", c)
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-medium text-slate-900">
                                                Payment Reminders
                                            </Label>
                                            <p className="text-xs text-slate-500">
                                                Auto-schedule email reminders.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={data.project.autoRemindersEnabled}
                                            onCheckedChange={(c) =>
                                                updateProject("autoRemindersEnabled", c)
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Sticky Footer Actions */}
            <div className="shrink-0 p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <p className="text-xs text-slate-400 hidden sm:block">
                    You can edit all project details later in Settings.
                </p>
                <div className="flex w-full sm:w-auto items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="text-slate-500"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] shadow-md shadow-indigo-100"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4 mr-2" /> Saving...
                            </>
                        ) : (
                            <>
                                Start Automation <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
