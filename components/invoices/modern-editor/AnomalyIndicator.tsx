"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Sparkles } from "lucide-react";

type AnomalyIndicatorProps = {
    hasAnomalies: boolean;
    issueCount: number;
    severity: "low" | "medium" | "high" | "critical";
    onClick: () => void;
};

export function AnomalyIndicator({
    hasAnomalies,
    issueCount,
    severity,
    onClick,
}: AnomalyIndicatorProps) {
    if (!hasAnomalies && issueCount === 0) return null;

    const severityColors = {
        low: "bg-emerald-500",
        medium: "bg-amber-500",
        high: "bg-orange-500",
        critical: "bg-red-500",
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                hasAnomalies && "animate-pulse"
            )}
        >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
                {issueCount} {issueCount === 1 ? "Issue" : "Issues"}
            </span>
            {/* Severity dot */}
            <span className={cn(
                "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white",
                severityColors[severity]
            )} />
        </button>
    );
}

// Floating indicator that appears near Send button
export function FloatingAnomalyBadge({
    show,
    count,
    onClick,
}: {
    show: boolean;
    count: number;
    onClick: () => void;
}) {
    if (!show || count === 0) return null;

    return (
        <button
            onClick={onClick}
            className={cn(
                "absolute -top-2 -right-2 z-10",
                "flex items-center justify-center",
                "h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold",
                "animate-bounce shadow-lg",
                "hover:scale-110 transition-transform"
            )}
        >
            {count > 9 ? "9+" : count}
        </button>
    );
}
