"use client";

import { memo, useState, useEffect, useMemo } from "react";
import { Play, Pause, CheckCircle, AlertCircle, Calendar, RefreshCw, Database, MessageSquare } from "lucide-react";

interface AutomationRun {
    id: string;
    name: string;
    status: "running" | "completed" | "failed";
    trigger: string;
    action: string;
    createdAt: string;
    pageTitle?: string;
    channelName?: string;
    details: string;
}

interface AutomationsResponse {
    success: boolean;
    automations: {
        running: AutomationRun[];
        completed: AutomationRun[];
        failed: AutomationRun[];
        total: number;
    };
}

const StatusBadge = memo(function StatusBadge({ status }: { status: AutomationRun["status"] }) {
    const config = useMemo(() => {
        switch (status) {
            case "running":
                return { icon: Play, color: "bg-blue-100 text-blue-700", label: "Running" };
            case "completed":
                return { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Completed" };
            case "failed":
                return { icon: AlertCircle, color: "bg-red-100 text-red-700", label: "Failed" };
        }
    }, [status]);

    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
});

const AutomationCard = memo(function AutomationCard({ automation }: { automation: AutomationRun }) {
    const timeAgo = useMemo(() => {
        const diff = Date.now() - new Date(automation.createdAt).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        }
        if (hours > 0) return `${hours}h ago`;
        return `${minutes}m ago`;
    }, [automation.createdAt]);

    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-violet-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{automation.name}</h4>
                    <p className="text-xs text-stone-500">{automation.details}</p>
                </div>
                <StatusBadge status={automation.status} />
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {automation.trigger}
                    </span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        {automation.action}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-500">
                    <Calendar className="w-3 h-3" />
                    {timeAgo}
                </div>
            </div>

            {(automation.pageTitle || automation.channelName) && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                    {automation.pageTitle && (
                        <div className="flex items-center gap-1 text-xs">
                            <Database className="w-3 h-3 text-stone-400" />
                            <span className="text-stone-600">{automation.pageTitle}</span>
                        </div>
                    )}
                    {automation.channelName && (
                        <div className="flex items-center gap-1 text-xs">
                            <MessageSquare className="w-3 h-3 text-stone-400" />
                            <span className="text-stone-600">#{automation.channelName}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export const RunningAutomations = memo(function RunningAutomations() {
    const [data, setData] = useState<AutomationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAutomations = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/integrations/automations");
            const json = await res.json();
            if (json.success) {
                setData(json);
            } else {
                setError(json.error || "Failed to load automations");
            }
        } catch (err) {
            setError("Failed to fetch automations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAutomations();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-600">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    const { running, completed, failed } = data?.automations || { running: [], completed: [], failed: [] };

    return (
        <div className="space-y-6">
            {running.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-600" />
                        Currently Running ({running.length})
                    </h3>
                    <div className="space-y-3">
                        {running.map((automation) => (
                            <AutomationCard key={automation.id} automation={automation} />
                        ))}
                    </div>
                </div>
            )}

            {completed.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Recently Completed
                    </h3>
                    <div className="space-y-3">
                        {completed.map((automation) => (
                            <AutomationCard key={automation.id} automation={automation} />
                        ))}
                    </div>
                </div>
            )}

            {failed.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Failed
                    </h3>
                    <div className="space-y-3">
                        {failed.map((automation) => (
                            <AutomationCard key={automation.id} automation={automation} />
                        ))}
                    </div>
                </div>
            )}

            {running.length === 0 && completed.length === 0 && failed.length === 0 && (
                <div className="text-center py-12 text-stone-500">
                    <Pause className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No automations running</p>
                    <p className="text-xs mt-1">Import data from Notion or Slack to see activity here</p>
                </div>
            )}
        </div>
    );
});
