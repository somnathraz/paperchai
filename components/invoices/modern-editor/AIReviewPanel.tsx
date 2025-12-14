"use client";

import { useState } from "react";
import { X, Sparkles, AlertTriangle, AlertCircle, Info, Check, Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIReviewResult, ReviewIssue, ReviewSuggestion, Anomaly } from "@/lib/ai-review";

type AIReviewPanelProps = {
    isOpen: boolean;
    onClose: () => void;
    reviewResult: AIReviewResult | null;
    isLoading: boolean;
    onApplyFix: (issue: ReviewIssue) => void;
    onApplySuggestion: (suggestion: ReviewSuggestion) => void;
    onApplyAllFixes: () => void;
};

const severityConfig = {
    critical: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
    warning: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
};

const riskConfig = {
    low: { color: "text-emerald-600", bg: "bg-emerald-500", label: "Low Risk" },
    medium: { color: "text-amber-600", bg: "bg-amber-500", label: "Medium Risk" },
    high: { color: "text-orange-600", bg: "bg-orange-500", label: "High Risk" },
    critical: { color: "text-red-600", bg: "bg-red-500", label: "Critical" },
};

export function AIReviewPanel({
    isOpen,
    onClose,
    reviewResult,
    isLoading,
    onApplyFix,
    onApplySuggestion,
    onApplyAllFixes,
}: AIReviewPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["issues"]));
    const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const handleApplyFix = (issue: ReviewIssue) => {
        onApplyFix(issue);
        setAppliedFixes(prev => new Set(prev).add(issue.id));
    };

    const handleApplyAllFixes = () => {
        onApplyAllFixes();
        if (reviewResult) {
            const fixableIds = reviewResult.issues.filter(i => i.autoFix).map(i => i.id);
            setAppliedFixes(new Set(fixableIds));
        }
    };

    const fixableIssues = reviewResult?.issues.filter(i => i.autoFix && !appliedFixes.has(i.id)) || [];

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-primary/5 to-emerald-500/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-primary to-emerald-500">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">AI Invoice Review</h2>
                        <p className="text-xs text-slate-500">Analyzing your invoice for issues</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-emerald-500 animate-ping opacity-20" />
                            <div className="relative p-4 rounded-full bg-gradient-to-r from-primary to-emerald-500">
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 animate-pulse">Analyzing invoice...</p>
                    </div>
                ) : reviewResult ? (
                    <div className="p-4 space-y-4">
                        {/* Risk Score */}
                        <div className={cn(
                            "rounded-xl p-4 border",
                            riskConfig[reviewResult.riskLevel].bg === "bg-emerald-500" ? "bg-emerald-50 border-emerald-200" :
                                riskConfig[reviewResult.riskLevel].bg === "bg-amber-500" ? "bg-amber-50 border-amber-200" :
                                    riskConfig[reviewResult.riskLevel].bg === "bg-orange-500" ? "bg-orange-50 border-orange-200" :
                                        "bg-red-50 border-red-200"
                        )}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-slate-700">Risk Score</span>
                                <Badge className={cn("text-xs", riskConfig[reviewResult.riskLevel].color)}>
                                    {riskConfig[reviewResult.riskLevel].label}
                                </Badge>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className={cn("text-4xl font-bold", riskConfig[reviewResult.riskLevel].color)}>
                                    {reviewResult.riskScore}
                                </span>
                                <span className="text-slate-400 text-sm mb-1">/ 100</span>
                            </div>
                            <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", riskConfig[reviewResult.riskLevel].bg)}
                                    style={{ width: `${reviewResult.riskScore}%` }}
                                />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {fixableIssues.length > 0 && (
                            <Button
                                onClick={handleApplyAllFixes}
                                className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white"
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                Fix All {fixableIssues.length} Issues
                            </Button>
                        )}

                        {/* Issues Section */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleSection("issues")}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-medium">Issues ({reviewResult.issues.length})</span>
                                </div>
                                {expandedSections.has("issues") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            {expandedSections.has("issues") && (
                                <div className="divide-y divide-slate-100">
                                    {reviewResult.issues.length === 0 ? (
                                        <div className="px-4 py-6 text-center">
                                            <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                            <p className="text-sm text-slate-600">No issues found!</p>
                                        </div>
                                    ) : (
                                        reviewResult.issues.map(issue => {
                                            const config = severityConfig[issue.severity];
                                            const Icon = config.icon;
                                            const isApplied = appliedFixes.has(issue.id);
                                            const hasAutoFix = !!issue.autoFix;

                                            return (
                                                <div key={issue.id} className={cn("px-4 py-3", config.bg, isApplied && "opacity-60")}>
                                                    <div className="flex items-start gap-3">
                                                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={cn("text-sm font-medium", isApplied ? "text-slate-500 line-through" : "text-slate-800")}>
                                                                    {issue.title}
                                                                </span>
                                                                <Badge variant="secondary" className={cn("text-[10px] h-4", config.badge)}>
                                                                    {issue.severity}
                                                                </Badge>
                                                                {isApplied && (
                                                                    <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700">
                                                                        ✓ Fixed
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className={cn("text-xs mb-2", isApplied ? "text-slate-400" : "text-slate-600")}>{issue.description}</p>

                                                            {hasAutoFix ? (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => handleApplyFix(issue)}
                                                                    disabled={isApplied}
                                                                    className={cn("h-7 text-xs", isApplied && "bg-emerald-100 text-emerald-700")}
                                                                >
                                                                    {isApplied ? (
                                                                        <><Check className="h-3 w-3 mr-1" /> Applied</>
                                                                    ) : (
                                                                        <><Zap className="h-3 w-3 mr-1" /> {issue.autoFix!.label}</>
                                                                    )}
                                                                </Button>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic">
                                                                    ⚠️ Requires manual action
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Anomalies Section */}
                        {reviewResult.anomalies.length > 0 && (
                            <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50">
                                <button
                                    onClick={() => toggleSection("anomalies")}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-medium text-amber-800">Anomalies Detected ({reviewResult.anomalies.length})</span>
                                    </div>
                                    {expandedSections.has("anomalies") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {expandedSections.has("anomalies") && (
                                    <div className="px-4 py-3 border-t border-amber-200">
                                        {reviewResult.anomalies.map(anomaly => (
                                            <div key={anomaly.id} className="mb-3 last:mb-0">
                                                <p className="text-sm font-medium text-amber-800">{anomaly.title}</p>
                                                <p className="text-xs text-amber-700">{anomaly.description}</p>
                                                {anomaly.metric && (
                                                    <div className="mt-1 text-xs text-amber-600">
                                                        Expected: {anomaly.metric.unit} {anomaly.metric.expected.toLocaleString()} →
                                                        Actual: {anomaly.metric.unit} {anomaly.metric.actual.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Prediction */}
                        {(reviewResult.predictedPaymentDate || reviewResult.latePaymentProbability !== undefined) && (
                            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-medium text-slate-700">Payment Prediction</span>
                                </div>
                                {reviewResult.latePaymentProbability !== undefined && (
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-600">Late Payment Risk</span>
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            reviewResult.latePaymentProbability > 50 ? "text-red-600" :
                                                reviewResult.latePaymentProbability > 25 ? "text-amber-600" : "text-emerald-600"
                                        )}>
                                            {reviewResult.latePaymentProbability}%
                                        </span>
                                    </div>
                                )}
                                {reviewResult.predictedPaymentDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600">Expected Payment</span>
                                        <span className="text-sm font-medium text-slate-800">
                                            {new Date(reviewResult.predictedPaymentDate).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analysis Time */}
                        <p className="text-center text-xs text-slate-400">
                            Analysis completed in {reviewResult.analysisTime}ms
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
                        <Sparkles className="h-12 w-12 text-slate-300" />
                        <p className="text-sm text-slate-500">Click "AI Review" to analyze your invoice</p>
                    </div>
                )}
            </div>
        </div>
    );
}
