"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ExtractedData } from "../types";

type ProjectScopeCardProps = {
    data: ExtractedData;
    onDataChange: (data: ExtractedData) => void;
};

export function ProjectScopeCard({ data, onDataChange }: ProjectScopeCardProps) {
    const updateProject = <K extends keyof ExtractedData["project"]>(
        field: K,
        value: ExtractedData["project"][K]
    ) => {
        onDataChange({
            ...data,
            project: { ...data.project, [field]: value },
        });
    };

    return (
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
                            onChange={(e) => updateProject("description", e.target.value)}
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
                            onChange={(e) => updateProject("startDate", e.target.value)}
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
                            onChange={(e) => updateProject("endDate", e.target.value)}
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
                            onValueChange={(v: ExtractedData["project"]["type"]) => updateProject("type", v)}
                        >
                            <SelectTrigger className="h-10 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FIXED">Fixed Price</SelectItem>
                                <SelectItem value="MILESTONE">Milestone Based</SelectItem>
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
                            onValueChange={(v: ExtractedData["project"]["billingStrategy"]) =>
                                updateProject("billingStrategy", v)
                            }
                        >
                            <SelectTrigger className="h-10 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SINGLE_INVOICE">Single Invoice</SelectItem>
                                <SelectItem value="PER_MILESTONE">Per Milestone</SelectItem>
                                <SelectItem value="RETAINER_MONTHLY">Monthly</SelectItem>
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
                                onChange={(e) => updateProject("totalBudget", parseFloat(e.target.value) * 100)}
                                className="pl-10 h-10 border-slate-200 font-semibold"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
