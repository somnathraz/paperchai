"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";

interface PipelineData {
    created: number;
    delivered: number;
    reminder1: number;
    paid: number;
}

export function AutomationPipeline() {
    const [counts, setCounts] = useState<PipelineData | null>(null);

    useEffect(() => {
        fetch("/api/dashboard/automation")
            .then(res => res.json())
            .then(data => setCounts(data.pipeline))
            .catch(console.error);
    }, []);

    const stages = [
        { id: 1, label: "Invoice Created", count: counts?.created || 0, status: "completed" },
        { id: 2, label: "Delivered", count: counts?.delivered || 0, status: "completed" },
        { id: 3, label: "Reminder 1", count: 0, status: "active", metrics: "98% Del." },
        { id: 4, label: "Reminder 2", count: 0, status: "pending" },
        { id: 5, label: "Reminder 3", count: 0, status: "pending" },
        { id: 6, label: "Escalation", count: 0, status: "pending" },
        { id: 7, label: "Paid", count: counts?.paid || 0, status: "completed", end: true },
    ];

    return (
        <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 overflow-x-auto">
            <h3 className="font-semibold mb-6">Automation Pipeline</h3>

            <div className="flex items-center min-w-[800px]">
                {stages.map((stage, index) => (
                    <div key={stage.id} className="flex items-center flex-1">
                        <div className="relative flex flex-col items-center group">
                            {/* Circle Node */}
                            <div className={`
                            h-10 w-10 flex items-center justify-center rounded-full border-4 z-10 transition-all font-semibold text-xs
                            ${stage.status === 'completed' ? 'bg-emerald-500 border-emerald-100 text-white' : ''}
                            ${stage.status === 'active' ? 'bg-white border-primary text-primary shadow-[0_0_0_4px_rgba(16,185,129,0.15)] scale-110' : ''}
                            ${stage.status === 'pending' ? 'bg-muted border-border text-muted-foreground' : ''}
                        `}>
                                {stage.status === 'completed' && stage.label === 'Paid' ? <Check className="h-4 w-4" /> : stage.count}
                            </div>

                            {/* Label */}
                            <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center w-24">
                                <p className={`text-xs font-semibold ${stage.status === 'active' ? 'text-primary' : 'text-foreground'}`}>
                                    {stage.label}
                                </p>
                                {stage.metrics && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                                        {stage.metrics}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Connector Line */}
                        {!stage.end && (
                            <div className="h-1 flex-1 mx-2 rounded-full overflow-hidden bg-muted relative">
                                <div className={`
                                h-full absolute left-0 top-0 transition-all duration-1000
                                ${stage.status === 'completed' ? 'w-full bg-emerald-500' : 'w-0'} 
                           `} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-14 p-4 bg-muted/20 rounded-xl flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Live Insight:</span>
                <span>Avg payout time after &quot;Reminder 1&quot; is currently <strong>3.2 days</strong>.</span>
            </div>
        </div>
    );
}
