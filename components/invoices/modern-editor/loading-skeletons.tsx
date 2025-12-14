"use client";

import { cn } from "@/lib/utils";

// Loading skeleton for Properties Panel
export function PropertiesPanelSkeleton({ collapsed }: { collapsed?: boolean }) {
    return (
        <div className={cn(
            "flex flex-col border-r border-border/60 bg-white transition-all duration-300 h-full",
            collapsed ? "w-12" : "w-[600px]"
        )}>
            {collapsed ? (
                <div className="flex flex-col items-center py-4">
                    <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                </div>
            ) : (
                <>
                    {/* Header skeleton */}
                    <div className="flex items-center justify-between border-b border-border/60 py-3 px-4">
                        <div className="space-y-1.5">
                            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                        </div>
                    </div>
                    {/* Tabs skeleton */}
                    <div className="flex flex-1">
                        <div className="w-56 border-r border-border/60 p-3 space-y-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
                            ))}
                        </div>
                        {/* Content skeleton */}
                        <div className="flex-1 p-4 space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Loading skeleton for Send Invoice Modal
export function SendModalSkeleton() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="h-4 w-64 bg-muted/50 rounded" />
                <div className="h-64 bg-muted/30 rounded-xl" />
                <div className="flex justify-end gap-3">
                    <div className="h-10 w-24 bg-muted rounded-lg" />
                    <div className="h-10 w-32 bg-primary/20 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// Loading skeleton for AI Review Panel
export function AIReviewPanelSkeleton() {
    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl border-l border-border/60 z-50 p-6 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded-full" />
            </div>
            <div className="h-4 w-48 bg-muted/50 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-muted/20 rounded-xl space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted/50 rounded" />
                    <div className="h-3 w-3/4 bg-muted/50 rounded" />
                </div>
            ))}
        </div>
    );
}

// Loading skeleton for AI Panel
export function AIPanelSkeleton() {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border/60 shadow-2xl p-6 animate-pulse">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-full" />
                    <div className="h-6 w-40 bg-muted rounded" />
                </div>
                <div className="h-24 bg-muted/30 rounded-xl" />
                <div className="flex justify-end gap-3">
                    <div className="h-10 w-24 bg-muted rounded-lg" />
                    <div className="h-10 w-32 bg-primary/20 rounded-lg" />
                </div>
            </div>
        </div>
    );
}
