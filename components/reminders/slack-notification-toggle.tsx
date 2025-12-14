"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Bell, Zap, Crown } from "lucide-react";

type IntegrationStatus = {
    connected: boolean;
    status: string;
};

type StatusResponse = {
    success: boolean;
    tier: string;
    integrationsEnabled: boolean;
    integrations: {
        slack: IntegrationStatus;
    };
};

export function SlackNotificationToggle() {
    const router = useRouter();
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);

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
            <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/2"></div>
            </div>
        );
    }

    // FREE USER - Show upsell
    if (status && !status.integrationsEnabled) {
        return (
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                        <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">Slack Reminder Notifications</h4>
                            <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-full font-medium flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Premium
                            </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
                            Get automatic reminder notifications in Slack when invoices are due or overdue.
                        </p>
                        <button
                            onClick={() => router.push("/settings/billing")}
                            className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
                        >
                            Upgrade to Enable
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // PREMIUM/OWNER - Show toggle
    const slackConnected = status?.integrations?.slack?.connected;

    if (!slackConnected) {
        return (
            <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-stone-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">Slack Notifications</h4>
                        <p className="text-xs text-stone-500 mb-3">
                            Connect Slack to receive reminder notifications automatically.
                        </p>
                        <button
                            onClick={() => router.push("/settings/integrations")}
                            className="px-3 py-1.5 bg-violet-600 text-white rounded-md text-xs font-medium hover:bg-violet-700 transition-colors"
                        >
                            Connect Slack
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Connected - Show toggle
    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4A154B] rounded-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-medium text-sm">Slack Reminder Notifications</h4>
                        <p className="text-xs text-stone-500">Send reminders to your Slack workspace</p>
                    </div>
                </div>
                <button
                    onClick={() => setEnabled(!enabled)}
                    className={`w-11 h-6 flex items-center rounded-full transition-colors ${enabled ? "bg-green-600" : "bg-stone-300"
                        }`}
                >
                    <div
                        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                    />
                </button>
            </div>
            {enabled && (
                <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Automatic notifications enabled
                    </p>
                </div>
            )}
        </div>
    );
}
