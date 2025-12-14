"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Database, MessageSquare, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { useIntegrationStatus } from "@/lib/hooks/use-integration";

export const IntegrationPanel = memo(function IntegrationPanel() {
    const router = useRouter();
    const status = useIntegrationStatus();

    const stats = useMemo(() => {
        if (!status) return null;

        const notionConnected = status.integrations?.notion?.connected ?? false;
        const slackConnected = status.integrations?.slack?.connected ?? false;
        const importsToday = status.usage?.importsToday ?? 0;
        const connectionsUsed = status.usage?.connectionsUsed ?? 0;

        return {
            notionConnected,
            slackConnected,
            importsToday,
            connectionsUsed,
            anyConnected: notionConnected || slackConnected,
        };
    }, [status]);

    if (!stats || !stats.anyConnected) {
        return null; // Don't show panel if no integrations connected
    }

    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-white dark:bg-stone-900/50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Integrations</h3>
                <button
                    onClick={() => router.push("/settings/integrations")}
                    className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                    Manage
                    <ArrowRight className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Notion Status */}
                {stats.notionConnected && (
                    <div className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-900 rounded-lg">
                        <div className="p-1.5 bg-black rounded">
                            <Database className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">Notion</p>
                            <p className="text-xs text-green-600">Connected</p>
                        </div>
                    </div>
                )}

                {/* Slack Status */}
                {stats.slackConnected && (
                    <div className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-900 rounded-lg">
                        <div className="p-1.5 bg-[#4A154B] rounded">
                            <MessageSquare className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">Slack</p>
                            <p className="text-xs text-green-600">Connected</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{stats.importsToday} imports today</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last sync: 2h ago</span>
                </div>
            </div>
        </div>
    );
});
