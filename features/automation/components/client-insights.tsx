"use client";

import { Users, TrendingDown, TrendingUp } from "lucide-react";

export function ClientInsights() {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Best Payers
                </h4>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Design Corp</span>
                        <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-full">avg 2 days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">TechStart</span>
                        <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-full">avg 1 day</span>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-3 w-3" /> Risk Watchlist
                </h4>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Global Ind.</span>
                        <span className="text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded-full">Late (2x)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Rahul S.</span>
                        <span className="text-red-600 text-xs bg-red-50 px-2 py-0.5 rounded-full">Unresponsive</span>
                    </div>
                </div>
            </div>

            <div className="col-span-2 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Optimization Suggestion</h4>
                        <p className="text-xs text-muted-foreground">
                            &quot;Switch <span className="font-medium text-foreground">Global Ind.</span> to WhatsApp reminders. They haven&apos;t opened 3 emails.&quot;
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
