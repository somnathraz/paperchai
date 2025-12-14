
"use client";

import { useDashboard } from "../hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";

function iconFor(type: "reminder" | "invoice" | "reliability" | "client" | "payment", description?: string) {
    if (type === "reliability") return ShieldCheck;
    if (type === "invoice") return CheckCircle2;
    // Fallback heuristic if channel is not explicitly separated in type, check description
    if (description?.includes("WhatsApp")) return MessageCircle;
    if (description?.includes("Email")) return Mail;
    return Bell;
}

export function ActivityWidget() {
    const { recentActivity, isLoading } = useDashboard();

    if (isLoading && recentActivity.length === 0) {
        return (
            <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="w-full max-w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Activity</p>
                    <h2 className="text-xl font-semibold">Live pulse</h2>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live</span>
            </div>
            <div className="mt-4 space-y-3">
                {recentActivity.length === 0 && !isLoading && (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                        No activity yet.
                    </div>
                )}
                {recentActivity.map((item) => {
                    const Icon = iconFor(item.type, item.description);
                    // Format date from ISO string
                    const date = new Date(item.timestamp).toLocaleString();

                    return (
                        <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-inner">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 via-primary/25 to-emerald-400/40 text-primary">
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 text-sm text-foreground">
                                <p>{item.description}</p>
                                <p className="text-xs text-muted-foreground">{date}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
