"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Database, MessageSquare, Zap, Sparkles } from "lucide-react";

type IntegrationStatus = {
    connected: boolean;
    status: string;
    workspaceName?: string;
};

type StatusResponse = {
    success: boolean;
    tier: string;
    integrationsEnabled: boolean;
    integrations: {
        slack: IntegrationStatus;
        notion: IntegrationStatus;
    };
};

export function IntegrationQuickAccess() {
    const router = useRouter();
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch("/api/integrations/status");
            const data = await response.json();
            if (data.success) {
                setStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch integration status");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50 animate-pulse">
                <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-2/3"></div>
            </div>
        );
    }

    // FREE USER - Show upsell
    if (status && !status.integrationsEnabled) {
        return (
            <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                        <Sparkles className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Automate Your Workflow</h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                            Import clients & projects from Notion. Get invoice notifications in Slack. Save hours every week.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push("/settings/billing")}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                            >
                                Upgrade to Premium
                            </button>
                            <button
                                onClick={() => router.push("/settings/integrations")}
                                className="px-4 py-2 border border-violet-300 text-violet-700 dark:text-violet-300 rounded-lg text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                            >
                                Learn More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PREMIUM/OWNER - Show quick access
    const notionConnected = status?.integrations?.notion?.connected;
    const slackConnected = status?.integrations?.slack?.connected;

    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Quick Actions</h3>
                <button
                    onClick={() => router.push("/settings/integrations")}
                    className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1"
                >
                    Manage
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Notion Import */}
                <button
                    onClick={() => router.push("/settings/integrations")}
                    disabled={!notionConnected}
                    className={`flex flex-col items-center p-4 border rounded-lg transition-all ${notionConnected
                            ? "hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                >
                    <div className={`p-2 rounded-full mb-2 ${notionConnected ? "bg-black text-white" : "bg-stone-200 text-stone-400"}`}>
                        <Database className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Import from Notion</span>
                    {!notionConnected && <span className="text-xs text-stone-400 mt-1">Not connected</span>}
                </button>

                {/* Slack Commands */}
                <button
                    onClick={() => router.push("/settings/integrations")}
                    disabled={!slackConnected}
                    className={`flex flex-col items-center p-4 border rounded-lg transition-all ${slackConnected
                            ? "hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                >
                    <div className={`p-2 rounded-full mb-2 ${slackConnected ? "bg-[#4A154B] text-white" : "bg-stone-200 text-stone-400"}`}>
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Slack Commands</span>
                    {!slackConnected && <span className="text-xs text-stone-400 mt-1">Not connected</span>}
                </button>
            </div>

            {/* Connection Status */}
            {(notionConnected || slackConnected) && (
                <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                        {notionConnected && (
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Notion: {status?.integrations?.notion?.workspaceName || "Connected"}
                            </div>
                        )}
                        {slackConnected && (
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Slack: {status?.integrations?.slack?.workspaceName || "Connected"}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
