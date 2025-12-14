"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ExternalLink, Database, MessageSquare, Sparkles } from "lucide-react";
import { useIntegrationStatus, useIsPremium, useIsConnected } from "@/lib/hooks/use-integration";

// Notion Education Callout
const NotionEducation = memo(function NotionEducation() {
    return (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-sm text-amber-900 dark:text-amber-100 mb-1">
                        Important: Share your databases
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        After connecting, you must manually share each Notion database with the PaperChai integration using
                        <strong> "Add connections"</strong> in Notion. Without this, imports will fail.
                    </p>
                </div>
            </div>
        </div>
    );
});

// Slack Try It Block
const SlackTryIt = memo(function SlackTryIt() {
    return (
        <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-sm mb-3">Try it now:</h4>
            <div className="space-y-2 text-xs font-mono">
                <div className="bg-white dark:bg-stone-800 p-2 rounded border">
                    <code>/invoice create Design work for Acme Corp</code>
                </div>
                <div className="bg-white dark:bg-stone-800 p-2 rounded border">
                    <code>/invoice status INV-001</code>
                </div>
                <div className="bg-white dark:bg-stone-800 p-2 rounded border">
                    <code>/invoice send INV-001</code>
                </div>
            </div>
            <p className="text-xs text-stone-500 mt-3">
                💡 <strong>Message Shortcut:</strong> Right-click any thread → "Create invoice from thread"
            </p>
            <p className="text-xs text-stone-400 mt-2">
                ⚠️ Slack free workspaces have 90-day message history limits
            </p>
        </div>
    );
});

// Integration Card Component
interface IntegrationCardProps {
    provider: "slack" | "notion";
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    features: string[];
    onConnect: () => void;
    onConfigure: () => void;
}

const IntegrationCard = memo(function IntegrationCard({
    provider,
    title,
    description,
    icon: Icon,
    features,
    onConnect,
    onConfigure,
}: IntegrationCardProps) {
    const status = useIntegrationStatus();
    const isConnected = useIsConnected(provider);
    const integration = status?.integrations?.[provider];

    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${provider === "slack" ? "bg-[#4A154B]" : "bg-black"}`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="text-sm text-stone-500">{description}</p>
                    </div>
                </div>
                <div>
                    {isConnected ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                            Connected
                        </span>
                    ) : (
                        <button
                            onClick={onConnect}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                        >
                            Connect
                        </button>
                    )}
                </div>
            </div>

            {/* Education Callouts */}
            {provider === "notion" && isConnected && <NotionEducation />}

            {/* Status Info */}
            {isConnected && integration && (
                <div className="mb-4 text-xs text-stone-500">
                    <div className="flex items-center gap-4">
                        {integration.workspaceName && (
                            <span>Workspace: <strong>{integration.workspaceName}</strong></span>
                        )}
                        {integration.lastSync && (
                            <span>Last sync: {new Date(integration.lastSync).toLocaleString()}</span>
                        )}
                    </div>
                    {integration.lastError && (
                        <div className="mt-2 text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {integration.lastError}
                        </div>
                    )}
                </div>
            )}

            {/* Features */}
            <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium">Features:</h4>
                <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-violet-600 mt-1">•</span>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Try It Block for Slack */}
            {provider === "slack" && isConnected && <SlackTryIt />}

            {/* Actions */}
            {isConnected && (
                <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                    <button
                        onClick={onConfigure}
                        className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                        {provider === "notion" ? "Import Data" : "View Commands"}
                    </button>
                    <a
                        href="/activity"
                        className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        See Activity
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}
        </div>
    );
});

// Main Connections Tab
export const ConnectionsTab = memo(function ConnectionsTab() {
    const router = useRouter();
    const isPremium = useIsPremium();

    const notionFeatures = useMemo(
        () => [
            "Import Clients, Projects, Agreements, Notes",
            "Manual sync (user-triggered)",
            isPremium ? "Auto-sync daily 👑" : "Auto-sync daily (Premium)",
            "Draft invoices from pages",
        ],
        [isPremium]
    );

    const slackFeatures = useMemo(
        () => [
            "Slash commands (/invoice create, status, send, mark-paid)",
            "Message shortcuts (Create from thread)",
            isPremium ? "Automatic notifications 👑" : "Notifications (Premium)",
            "Real-time invoice updates",
        ],
        [isPremium]
    );

    // Premium Upsell
    if (!isPremium) {
        return (
            <div className="p-6">
                <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 text-center">
                    <div className="inline-flex p-4 bg-violet-100 dark:bg-violet-900/50 rounded-full mb-4">
                        <Sparkles className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Unlock Integrations</h3>
                    <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
                        Connect Notion and Slack to automate your workflow. Import clients, create invoices from threads,
                        and get real-time notifications.
                    </p>
                    <button
                        onClick={() => router.push("/settings/billing")}
                        className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                    >
                        Upgrade to Premium
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <IntegrationCard
                provider="notion"
                title="Notion"
                description="Import and sync your data"
                icon={Database}
                features={notionFeatures}
                onConnect={() => (window.location.href = "/api/integrations/notion/oauth/authorize")}
                onConfigure={() => router.push("/settings/integrations")}
            />

            <IntegrationCard
                provider="slack"
                title="Slack"
                description="Commands and notifications"
                icon={MessageSquare}
                features={slackFeatures}
                onConnect={() => (window.location.href = "/api/integrations/slack/oauth/authorize")}
                onConfigure={() => router.push("/settings/integrations")}
            />
        </div>
    );
});
