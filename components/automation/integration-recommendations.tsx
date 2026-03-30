"use client";

import { memo, useState, useEffect } from "react";
import { Database, MessageSquare, Sparkles, ArrowRight, Zap, Loader2 } from "lucide-react";

interface IntegrationStatus {
    integrations?: {
        notion?: { connected: boolean };
        slack?: { connected: boolean };
    };
    tier?: string;
}

export const IntegrationRecommendations = memo(function IntegrationRecommendations() {
    const [status, setStatus] = useState<IntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/integrations/status");
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);
                }
            } catch (err) {
                console.error("Failed to fetch integration status");
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const notionConnected = status?.integrations?.notion?.connected ?? false;
    const slackConnected = status?.integrations?.slack?.connected ?? false;

    // Loading state
    if (loading) {
        return (
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
            </div>
        );
    }

    // If both connected, show success message
    if (notionConnected && slackConnected) {
        return (
            <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">Integrations Active</h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                            Notion and Slack are connected. Your automation workflows are ready to use.
                        </p>
                        <a
                            href="/settings/integrations"
                            className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1 hover:underline"
                        >
                            Manage Automations
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Show recommendations for missing integrations
    return (
        <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                    <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Supercharge Your Automation</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                        Connect Notion and Slack to unlock powerful automation workflows
                    </p>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {/* Notion Card */}
                {!notionConnected && (
                    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-black rounded">
                                <Database className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Connect Notion</h4>
                                <p className="text-xs text-stone-500">Import clients & projects</p>
                            </div>
                        </div>
                        <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1 mb-3">
                            <li>• Auto-import from databases</li>
                            <li>• Extract milestones from agreements</li>
                            <li>• Draft invoices from pages</li>
                        </ul>
                        <a
                            href="/api/integrations/notion/oauth/authorize?next=/automation"
                            className="block w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors text-center"
                        >
                            Connect Notion
                        </a>
                    </div>
                )}

                {/* Slack Card */}
                {!slackConnected && (
                    <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-[#4A154B] rounded">
                                <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h4 className="font-medium text-sm">Connect Slack</h4>
                                <p className="text-xs text-stone-500">Commands & notifications</p>
                            </div>
                        </div>
                        <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-1 mb-3">
                            <li>• Create invoices from threads</li>
                            <li>• Get real-time notifications</li>
                            <li>• Use slash commands</li>
                        </ul>
                        <a
                            href="/api/integrations/slack/oauth/authorize?next=/automation"
                            className="block w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors text-center"
                        >
                            Connect Slack
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
});
