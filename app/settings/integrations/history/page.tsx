"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SettingsLayout } from "@/components/settings/settings-layout";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    ArrowLeft,
    ExternalLink,
    MessageSquare,
    Database,
    RefreshCw,
    Filter
} from "lucide-react";

type ImportItem = {
    id: string;
    provider: "slack" | "notion";
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    importType: string;
    aiSummary?: string;
    errorMessage?: string;
    createdAt: string;
    // Slack specific
    channelName?: string;
    threadTs?: string;
    invoiceId?: string;
    confidenceScore?: number;
    // Notion specific
    notionPageTitle?: string;
    projectId?: string;
    clientId?: string;
};

type ImportStats = {
    slack: { total: number; completed: number };
    notion: { total: number; completed: number };
};

export default function ImportHistoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [imports, setImports] = useState<ImportItem[]>([]);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [filter, setFilter] = useState<{
        provider: string;
        status: string;
    }>({ provider: "all", status: "" });
    const [error, setError] = useState<string | null>(null);

    const fetchImports = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter.provider !== "all") params.set("provider", filter.provider);
            if (filter.status) params.set("status", filter.status);

            const response = await fetch(`/api/integrations/imports?${params}`);
            const data = await response.json();

            if (data.success) {
                setImports(data.imports);
                setStats(data.stats);
                setError(null);
            } else {
                setError(data.error || "Failed to load imports");
            }
        } catch (err) {
            setError("Failed to load import history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImports();
    }, [filter]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "FAILED":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "PROCESSING":
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            COMPLETED: "bg-emerald-50 text-emerald-700",
            FAILED: "bg-red-50 text-red-700",
            PROCESSING: "bg-blue-50 text-blue-700",
            PENDING: "bg-gray-100 text-gray-700",
        };
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.PENDING}`}>
                {getStatusIcon(status)}
                {status}
            </span>
        );
    };

    const getProviderIcon = (provider: string) => {
        if (provider === "slack") {
            return (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A154B]">
                    <MessageSquare className="h-4 w-4 text-white" />
                </div>
            );
        }
        return (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
                <Database className="h-4 w-4 text-white" />
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <SettingsLayout
            current="/settings/integrations/history"
            title="Import History"
            description="View all your Slack and Notion imports"
        >
            {/* Back Button */}
            <button
                onClick={() => router.push("/settings/integrations")}
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Integrations
            </button>

            {/* Stats Cards */}
            {stats && (
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-border/40 bg-white/60 p-4">
                        <p className="text-sm text-muted-foreground">Slack Imports</p>
                        <p className="text-2xl font-semibold">{stats.slack.total}</p>
                        <p className="text-xs text-emerald-600">{stats.slack.completed} completed</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-white/60 p-4">
                        <p className="text-sm text-muted-foreground">Notion Imports</p>
                        <p className="text-2xl font-semibold">{stats.notion.total}</p>
                        <p className="text-xs text-emerald-600">{stats.notion.completed} completed</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-white/60 p-4">
                        <p className="text-sm text-muted-foreground">Total Imports</p>
                        <p className="text-2xl font-semibold">{stats.slack.total + stats.notion.total}</p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-white/60 p-4">
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-semibold">
                            {stats.slack.total + stats.notion.total > 0
                                ? Math.round(((stats.slack.completed + stats.notion.completed) / (stats.slack.total + stats.notion.total)) * 100)
                                : 0}%
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={filter.provider}
                        onChange={(e) => setFilter((f) => ({ ...f, provider: e.target.value }))}
                        className="rounded-lg border border-border/40 bg-white px-3 py-1.5 text-sm"
                    >
                        <option value="all">All Sources</option>
                        <option value="slack">Slack</option>
                        <option value="notion">Notion</option>
                    </select>
                    <select
                        value={filter.status}
                        onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
                        className="rounded-lg border border-border/40 bg-white px-3 py-1.5 text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                    </select>
                </div>
                <button
                    onClick={fetchImports}
                    className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Import List */}
            {!loading && imports.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">No imports yet</p>
                    <p className="mt-1 text-sm text-muted-foreground/70">
                        Connect Slack or Notion and start importing data
                    </p>
                </div>
            )}

            {!loading && imports.length > 0 && (
                <div className="divide-y divide-border/40 rounded-xl border border-border/40 bg-white">
                    {imports.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 p-4 hover:bg-muted/10">
                            {getProviderIcon(item.provider)}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                        {item.provider === "slack"
                                            ? item.channelName || `Channel`
                                            : item.notionPageTitle || "Untitled"}
                                    </p>
                                    {getStatusBadge(item.status)}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {item.importType.replace(/_/g, " ")}
                                    {item.confidenceScore && ` • ${item.confidenceScore}% confidence`}
                                </p>
                                {item.aiSummary && (
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/80">
                                        {item.aiSummary}
                                    </p>
                                )}
                                {item.errorMessage && (
                                    <p className="mt-1 text-sm text-red-500">{item.errorMessage}</p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                                {item.invoiceId && (
                                    <a
                                        href={`/dashboard/invoices/${item.invoiceId}`}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        View Invoice <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                                {item.projectId && (
                                    <a
                                        href={`/dashboard/projects/${item.projectId}`}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        View Project <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SettingsLayout>
    );
}
