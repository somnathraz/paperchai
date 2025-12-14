
"use client";

import { AlertTriangle, RefreshCcw, XCircle, CheckCircle2 } from "lucide-react";
import { useReminders } from "../hooks/useReminders";

interface FailureItem {
    id: string;
    title: string;
    reason: string;
    client: string;
    type: string;
}

export function Failures() {
    const { failures, isLoading } = useReminders();

    if (isLoading && failures.length === 0) {
        return (
            <div className="rounded-3xl border border-border/50 bg-card/50 p-5 space-y-4 animate-pulse">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-20 w-full bg-muted/20 rounded-xl" />
            </div>
        )
    }

    if (failures.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-card/30 p-5 flex flex-col items-center justify-center text-center min-h-[150px]">
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">All systems normal</p>
                <p className="text-xs text-muted-foreground mt-1">No failed reminders or missed schedules.</p>
            </div>
        )
    }

    return (
        <div className="rounded-3xl border border-red-200 bg-red-50/30 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Attention Items ({failures.length})</h3>
            </div>

            <div className="space-y-2">
                {failures.map((item: FailureItem) => (
                    <div key={item.id} className="bg-white rounded-xl p-3 border border-red-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                <p className="text-xs text-red-600 mt-0.5">{item.reason}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Client: {item.client}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Retry">
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                </button>
                                <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Dismiss">
                                    <XCircle className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3">
                            <button className="text-xs font-medium text-muted-foreground hover:text-foreground">View Log</button>
                            <button className="text-xs font-medium text-primary hover:text-primary/80">Update Email</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
