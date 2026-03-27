"use client";

import { memo } from "react";
import { Database, MessageSquare, Sparkles, ArrowRight, Zap, Loader2, Unplug } from "lucide-react";
import { useAutomation } from "../hooks/useAutomation";
import { NotionImportPanel } from "./NotionImportPanel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const IntegrationRecommendations = memo(function IntegrationRecommendations() {
  const { integrationStatus, isLoading, refreshData } = useAutomation();

  const notionConnected = integrationStatus?.integrations?.notion?.connected ?? false;
  const slackConnected = integrationStatus?.integrations?.slack?.connected ?? false;
  const canManageIntegrations = integrationStatus?.canManageIntegrations ?? false;

  const disconnectIntegration = async (provider: "notion" | "slack") => {
    if (!canManageIntegrations) return;
    // eslint-disable-next-line no-alert -- confirm is intentional for connect
    const confirmed = window.confirm(
      `Disconnect ${provider === "notion" ? "Notion" : "Slack"} from this workspace?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to disconnect ${provider}`);
      }
      toast.success(payload?.message || `${provider} disconnected`);
      refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    }
  };

  // Loading state
  if (isLoading && !integrationStatus) {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  // If Notion connected, show import panel
  if (notionConnected) {
    return (
      <div className="space-y-4">
        {/* Notion Import Panel */}
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Notion Connected ✓</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                Browse your Notion databases and import data into PaperChai
              </p>
              {canManageIntegrations && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectIntegration("notion")}
                  className="mt-1 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <Unplug className="mr-1 h-4 w-4" />
                  Disconnect Notion
                </Button>
              )}
            </div>
          </div>

          <NotionImportPanel />
        </div>

        {/* Slack Card - Show if not connected */}
        {!slackConnected && (
          <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                <Sparkles className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Add Slack Integration</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Connect Slack for commands and notifications
                </p>
              </div>
            </div>

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
              {canManageIntegrations ? (
                <a
                  href="/api/integrations/slack/oauth/authorize?next=/automation"
                  className="block w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors text-center"
                >
                  Connect Slack
                </a>
              ) : (
                <div className="block w-full px-3 py-2 bg-stone-200 dark:bg-stone-800 text-stone-500 rounded-lg text-sm font-medium text-center">
                  Owner/Admin required
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If Slack connected but not Notion, show just success for Slack
  if (slackConnected) {
    return (
      <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-950/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Slack Connected ✓</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
              Slack integration is active. Use slash commands in Slack channels.
            </p>
            <a
              href="/settings/integrations"
              className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-1 hover:underline"
            >
              Manage Integrations
              <ArrowRight className="w-4 h-4" />
            </a>
            {canManageIntegrations && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => disconnectIntegration("slack")}
                className="mt-2 w-full sm:w-auto border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <Unplug className="mr-1 h-4 w-4" />
                Disconnect Slack
              </Button>
            )}
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
          <h3 className="font-semibold text-lg mb-1">Connect Your Tools</h3>
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
            {canManageIntegrations ? (
              <a
                href="/api/integrations/notion/oauth/authorize?next=/automation"
                className="block w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors text-center"
              >
                Connect Notion
              </a>
            ) : (
              <div className="block w-full px-3 py-2 bg-stone-200 dark:bg-stone-800 text-stone-500 rounded-lg text-sm font-medium text-center">
                Owner/Admin required
              </div>
            )}
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
            {canManageIntegrations ? (
              <a
                href="/api/integrations/slack/oauth/authorize?next=/automation"
                className="block w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors text-center"
              >
                Connect Slack
              </a>
            ) : (
              <div className="block w-full px-3 py-2 bg-stone-200 dark:bg-stone-800 text-stone-500 rounded-lg text-sm font-medium text-center">
                Owner/Admin required
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
