"use client";

import { useEffect, useState } from "react";
import {
    Mail, Bell, CheckCircle, AlertTriangle, Clock, ArrowRight,
    Loader2, TrendingUp, Calendar, XCircle, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

type AutomationData = {
    todaySummary: {
        emailsSent: number;
        remindersFired: number;
        invoicesCreated: number;
        invoicesPaid: number;
    };
    pipeline: {
        draft: number;
        scheduled: number;
        sent: number;
        reminder1: number;
        reminder2: number;
        overdue: number;
        paid: number;
    };
    upcomingAutomations: Array<{
        invoiceId: string;
        invoiceNumber: string;
        clientName: string;
        action: string;
        scheduledAt: string;
    }>;
    recentlyCompleted: Array<{
        invoiceId: string;
        invoiceNumber: string;
        clientName: string;
        completedAt: string;
        amount: number;
    }>;
    errors: Array<{
        id: string;
        type: string;
        message: string;
        invoiceId?: string;
        clientName: string;
        time: string;
    }>;
};

const pipelineStages = [
    { key: "draft", label: "Draft", color: "bg-slate-400" },
    { key: "scheduled", label: "Scheduled", color: "bg-blue-400" },
    { key: "sent", label: "Sent", color: "bg-emerald-400" },
    { key: "reminder1", label: "Reminder 1", color: "bg-amber-400" },
    { key: "reminder2", label: "Reminder 2", color: "bg-orange-400" },
    { key: "overdue", label: "Overdue", color: "bg-red-400" },
    { key: "paid", label: "Paid", color: "bg-green-500" },
];

export function AutomationLifecycle() {
    const [data, setData] = useState<AutomationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/dashboard/automation");
            if (!res.ok) throw new Error("Failed to load");
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-border/60 bg-white p-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="rounded-2xl border border-border/60 bg-white p-6">
                <div className="text-center py-8 text-muted-foreground">
                    Failed to load automation data
                </div>
            </div>
        );
    }

    const totalPipeline = Object.values(data.pipeline).reduce((a, b) => a + b, 0);

    return (
        <div className="rounded-2xl border border-border/60 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Automation Overview</h2>
                        <p className="text-xs text-muted-foreground">Invoice lifecycle & automation status</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} className="h-8">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Today's Summary */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 border border-blue-200/50">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <Mail className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-medium tracking-wide">Emails</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{data.todaySummary.emailsSent}</p>
                        <p className="text-[10px] text-blue-500">Today</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 border border-amber-200/50">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <Bell className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-medium tracking-wide">Reminders</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700">{data.todaySummary.remindersFired}</p>
                        <p className="text-[10px] text-amber-500">Today</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 border border-emerald-200/50">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-medium tracking-wide">Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{data.todaySummary.invoicesPaid}</p>
                        <p className="text-[10px] text-emerald-500">Today</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 border border-purple-200/50">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-medium tracking-wide">Created</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">{data.todaySummary.invoicesCreated}</p>
                        <p className="text-[10px] text-purple-500">Today</p>
                    </div>
                </div>

                {/* Pipeline Visualization */}
                <div className="space-y-3 overflow-hidden">
                    <h3 className="text-sm font-medium text-foreground">Invoice Pipeline</h3>
                    <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
                        {pipelineStages.map((stage, idx) => {
                            const count = data.pipeline[stage.key as keyof typeof data.pipeline] || 0;
                            const width = totalPipeline > 0 ? Math.max((count / totalPipeline) * 100, count > 0 ? 8 : 2) : 14;

                            return (
                                <div key={stage.key} className="flex items-center shrink-0" style={{ flex: totalPipeline > 0 ? undefined : 1 }}>
                                    <div
                                        className={cn(
                                            "h-10 rounded-lg flex items-center justify-center transition-all min-w-[40px]",
                                            stage.color,
                                            count > 0 ? "opacity-100" : "opacity-40"
                                        )}
                                        style={{ width: totalPipeline > 0 ? `${Math.max(width, 10)}%` : undefined }}
                                        title={`${stage.label}: ${count}`}
                                    >
                                        <span className="text-xs font-bold text-white">{count}</span>
                                    </div>
                                    {idx < pipelineStages.length - 1 && (
                                        <ArrowRight className="h-4 w-4 text-slate-300 mx-1 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1 overflow-x-auto gap-4">
                        {pipelineStages.map(stage => (
                            <span key={stage.key} className="whitespace-nowrap">{stage.label}</span>
                        ))}
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Upcoming Automations */}
                    <div className="rounded-xl border border-border/40 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <h4 className="text-sm font-medium">Upcoming Automations</h4>
                        </div>
                        {data.upcomingAutomations.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No upcoming automations</p>
                        ) : (
                            <div className="space-y-2">
                                {data.upcomingAutomations.slice(0, 4).map((item) => (
                                    <Link
                                        key={item.invoiceId}
                                        href={`/invoices/${item.invoiceId}`}
                                        className="block p-2 rounded-lg bg-white border border-border/40 hover:border-blue-200 hover:bg-blue-50/30 transition"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-foreground">#{item.invoiceNumber}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline" className="text-[10px] h-5">{item.action}</Badge>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {item.scheduledAt ? formatDistanceToNow(new Date(item.scheduledAt), { addSuffix: true }) : "Soon"}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recently Completed */}
                    <div className="rounded-xl border border-border/40 bg-emerald-50/30 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <h4 className="text-sm font-medium">Recently Completed</h4>
                        </div>
                        {data.recentlyCompleted.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No recent completions</p>
                        ) : (
                            <div className="space-y-2">
                                {data.recentlyCompleted.slice(0, 4).map((item) => (
                                    <Link
                                        key={item.invoiceId}
                                        href={`/invoices/${item.invoiceId}`}
                                        className="block p-2 rounded-lg bg-white border border-emerald-200/50 hover:border-emerald-300 transition"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-foreground">#{item.invoiceNumber}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-600">{formatCurrency(item.amount)}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Errors & Warnings */}
                {data.errors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <h4 className="text-sm font-medium text-red-700">Errors & Warnings</h4>
                            <Badge variant="destructive" className="ml-auto text-[10px] h-5">{data.errors.length}</Badge>
                        </div>
                        <div className="space-y-2">
                            {data.errors.map((err) => (
                                <div key={err.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-red-100">
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-foreground truncate">{err.message}</p>
                                        <p className="text-[10px] text-muted-foreground">{err.clientName}</p>
                                    </div>
                                    {err.invoiceId && (
                                        <Link href={`/invoices/${err.invoiceId}`}>
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px]">View</Button>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
