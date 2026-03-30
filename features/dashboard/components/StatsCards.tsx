
"use client";

import { TrendingUp, Timer, ShieldCheck, Wallet } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(value: number, currency = "INR") {
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
    }
    if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function Sparkline({ values }: { values: number[] }) {
    if (!values || values.length === 0) {
        values = [0, 0, 0, 0, 0];
    }
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const path = values
        .map((value, idx) => {
            const normY = ((value - min) / (max - min || 1)) * 40;
            const x = (idx / (values.length - 1 || 1)) * 100;
            const y = 40 - normY + 2;
            return `${idx === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");

    return (
        <svg viewBox="0 0 100 42" className="mt-3 h-16 w-full text-primary/60">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

export function StatsCards() {
    const { stats, isLoading } = useDashboard();

    if (isLoading || !stats) {
        return (
            <section className="w-full max-w-full overflow-hidden">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 rounded-2xl bg-white/50 border border-white/60 animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    // Calculate deltas based on stats
    const collectedDelta =
        stats.lastMonthPaid > 0
            ? `+${Math.round(((stats.thisMonthPaid - stats.lastMonthPaid) / stats.lastMonthPaid) * 100)}% this month`
            : stats.totalRevenue > 0
                ? "This month"
                : "No data";

    const cards = [
        {
            label: "Collected",
            value: formatCurrency(stats.totalRevenue),
            delta: collectedDelta,
            icon: Wallet,
            sparkline: stats.collectedSparkline,
            gradient: "from-primary/20 via-primary/10 to-white",
        },
        {
            label: "Outstanding",
            value: formatCurrency(stats.outstandingAmount),
            delta: `${stats.pendingInvoices} invoices`,
            icon: TrendingUp,
            sparkline: stats.outstandingSparkline,
            gradient: "from-amber-200/40 via-white to-white",
        },
        {
            label: "Avg payout time",
            value: stats.averagePaymentTime ? `${stats.averagePaymentTime.toFixed(1)} days` : "—",
            delta: stats.averagePaymentTime ? (stats.averagePaymentTime < 10 ? "Fast" : stats.averagePaymentTime < 20 ? "Average" : "Slow") : "No data",
            icon: Timer,
            sparkline: stats.payoutSparkline,
            gradient: "from-indigo-200/40 via-white to-white",
        },
        {
            label: "Reliability",
            value: stats.reliability ? `${Math.round(stats.reliability)}%` : "—",
            delta: stats.reliability ? (stats.reliability >= 85 ? "Excellent" : stats.reliability >= 70 ? "Good" : "Needs attention") : "No data",
            icon: ShieldCheck,
            sparkline: stats.reliabilitySparkline,
            gradient: "from-emerald-200/40 via-white to-white",
        },
    ];

    return (
        <section className="w-full max-w-full overflow-hidden">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className={`group relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br ${card.gradient} px-4 py-3 shadow-[0_20px_80px_-60px_rgba(15,23,42,0.6)] backdrop-blur-xl transition hover:shadow-lg`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{card.label}</p>
                                <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
                                <p className="text-xs text-muted-foreground">{card.delta}</p>
                            </div>
                            <div className="rounded-full bg-white/60 p-2 text-primary shadow-inner shrink-0">
                                <card.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <Sparkline values={card.sparkline} />
                    </div>
                ))}
            </div>
        </section>
    );
}
