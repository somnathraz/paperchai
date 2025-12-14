"use client";

import { useState } from "react";
import { Sparkles, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RecommendationType = "workspace" | "client" | "project";

export type Recommendation = {
    field: string;
    label: string;
    value: any;
    displayValue: string;
    explanation: string;
    count?: number;
};

type SmartDefaultsBannerProps = {
    type: RecommendationType;
    recommendations: Recommendation[];
    onApply: (field: string, value: any) => void;
    onApplyAll: () => void;
    onDismiss: () => void;
    className?: string;
};

const typeConfig = {
    workspace: {
        title: "Suggested for you",
        subtitle: "Based on your recent invoices",
        color: "bg-blue-50 border-blue-200",
        iconColor: "text-blue-600",
    },
    client: {
        title: "Recommended for this client",
        subtitle: "Based on previous invoices",
        color: "bg-emerald-50 border-emerald-200",
        iconColor: "text-emerald-600",
    },
    project: {
        title: "Based on this project",
        subtitle: "Previously billed items",
        color: "bg-purple-50 border-purple-200",
        iconColor: "text-purple-600",
    },
};

export function SmartDefaultsBanner({
    type,
    recommendations,
    onApply,
    onApplyAll,
    onDismiss,
    className,
}: SmartDefaultsBannerProps) {
    const [expanded, setExpanded] = useState(false);
    const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
    const config = typeConfig[type];

    if (recommendations.length === 0) return null;

    const handleApply = (rec: Recommendation) => {
        onApply(rec.field, rec.value);
        setAppliedFields(prev => new Set(prev).add(rec.field));
    };

    const handleApplyAll = () => {
        onApplyAll();
        setAppliedFields(new Set(recommendations.map(r => r.field)));
    };

    const visibleRecs = expanded ? recommendations : recommendations.slice(0, 3);
    const hasMore = recommendations.length > 3;

    return (
        <div className={cn(
            "rounded-lg border p-3 overflow-hidden",
            config.color,
            className
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded", config.iconColor)}>
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">{config.title}</p>
                        <p className="text-xs text-slate-500">{config.subtitle}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                    onClick={onDismiss}
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Recommendations */}
            <div className="mt-3 space-y-2">
                {visibleRecs.map((rec) => {
                    const isApplied = appliedFields.has(rec.field);
                    return (
                        <div
                            key={rec.field}
                            className="flex items-center justify-between gap-2 bg-white/60 rounded-md px-2.5 py-1.5"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">{rec.label}:</span>
                                    <span className="text-xs font-medium text-slate-800 line-clamp-1">
                                        {rec.displayValue}
                                    </span>
                                    {rec.count && rec.count > 1 && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                            {rec.count}x
                                        </Badge>
                                    )}
                                </div>
                                {rec.explanation && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                        {rec.explanation}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant={isApplied ? "ghost" : "secondary"}
                                size="sm"
                                className={cn(
                                    "h-6 text-xs shrink-0",
                                    isApplied && "text-emerald-600 pointer-events-none"
                                )}
                                onClick={() => handleApply(rec)}
                                disabled={isApplied}
                            >
                                {isApplied ? (
                                    <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Applied
                                    </>
                                ) : (
                                    "Apply"
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
                {hasMore && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-slate-500"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                {recommendations.length - 3} more
                            </>
                        )}
                    </Button>
                )}
                {recommendations.length > 1 && appliedFields.size < recommendations.length && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 text-xs ml-auto"
                        onClick={handleApplyAll}
                    >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Apply all
                    </Button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Recommendation Chip - Inline suggestion
// ============================================================================

type RecommendationChipProps = {
    label: string;
    onClick: () => void;
    source?: string;
    applied?: boolean;
    className?: string;
};

export function RecommendationChip({
    label,
    onClick,
    source,
    applied = false,
    className,
}: RecommendationChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={applied}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                applied
                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200",
                className
            )}
            title={source}
        >
            {applied ? (
                <Check className="h-2.5 w-2.5" />
            ) : (
                <Sparkles className="h-2.5 w-2.5" />
            )}
            {label}
        </button>
    );
}

// ============================================================================
// Due Date Recommendation - Special component
// ============================================================================

type DueDateRecommendationProps = {
    date: Date;
    explanation: string;
    onApply: () => void;
    applied?: boolean;
    className?: string;
};

export function DueDateRecommendation({
    date,
    explanation,
    onApply,
    applied = false,
    className,
}: DueDateRecommendationProps) {
    const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });

    return (
        <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg overflow-hidden",
            applied ? "bg-emerald-50" : "bg-amber-50",
            className
        )}>
            <Sparkles className={cn(
                "h-4 w-4 shrink-0",
                applied ? "text-emerald-600" : "text-amber-600"
            )} />
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-xs font-medium",
                    applied ? "text-emerald-800" : "text-amber-800"
                )}>
                    AI suggests: <strong>{formattedDate}</strong>
                </p>
                <p className="text-[10px] text-slate-500 line-clamp-1">{explanation}</p>
            </div>
            <Button
                variant={applied ? "ghost" : "secondary"}
                size="sm"
                className={cn(
                    "h-6 text-xs shrink-0",
                    applied && "text-emerald-600 pointer-events-none"
                )}
                onClick={onApply}
                disabled={applied}
            >
                {applied ? (
                    <>
                        <Check className="h-3 w-3 mr-1" />
                        Applied
                    </>
                ) : (
                    "Use"
                )}
            </Button>
        </div>
    );
}
