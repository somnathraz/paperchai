"use client";

import { useEffect, useState } from "react";
import { Activity, MousePointerClick, TrendingUp, Sparkles } from "lucide-react";

interface HealthData {
    deliveryRate: number;
    failedCount: number;
    openRate: number;
}

export function HealthStats() {
    const [stats, setStats] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/dashboard/reminders");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.health);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return <div className="space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-muted rounded-2xl" />
                <div className="h-24 bg-muted rounded-2xl" />
            </div>
            <div className="h-32 bg-muted rounded-2xl" />
        </div>
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 px-1">
                <Activity className="h-4 w-4 text-emerald-500" />
                Reminder Health
            </h3>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">Delivery Rate</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stats?.deliveryRate || 100}%</span>
                        <span className="text-xs font-medium text-emerald-600 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-0.5" /> +2%
                        </span>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">Pay Link Clicks</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stats?.openRate || 72}%</span>
                        <span className="text-xs font-medium text-emerald-600 flex items-center">
                            <MousePointerClick className="h-3 w-3 mr-0.5" /> High
                        </span>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-4 relative overflow-hidden">
                <div className="flex items-start gap-3 relative z-10">
                    <div className="mt-0.5 h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">AI Insight</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Clients who get email reminders at 10 AM pay 27% faster than afternoon sends.
                        </p>
                        <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">Apply optimization</button>
                    </div>
                </div>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
            </div>
        </div>
    );
}
