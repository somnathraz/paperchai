"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { CheckCircle2, AlertCircle, Loader2, Link2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { StatusResponse } from "@/lib/hooks/use-integration";

type ProviderKey = "slack" | "notion";
type SlackCommand = {
  id: string;
  command: string;
  rawText: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  invoice: {
    id: string;
    number: string;
    status: string;
  } | null;
};

type SlackActivityResponse = {
  success: boolean;
  summary: {
    rangeDays: number;
    totalCommands: number;
    createCommands: number;
    executedCommands: number;
    failedCommands: number;
    successRate: number;
  };
  invoices: {
    totalSlackCreated: number;
    statusCounts: Record<string, number>;
  };
  commands: SlackCommand[];
};

export default function IntegrationsPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<ProviderKey | null>(null);
  const [slackActivity, setSlackActivity] = useState<SlackActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load integration status");
      }
      setStatus(payload as StatusResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load integration status");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSlackActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const response = await fetch("/api/integrations/slack/commands/activity?limit=10", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load Slack activity");
      }
      setSlackActivity(payload as SlackActivityResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Slack activity");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSlackActivity();
  }, [fetchStatus, fetchSlackActivity]);

  const canManage = status?.canManageIntegrations ?? false;

  const runDisconnect = useCallback(
    async (provider: ProviderKey) => {
      if (!canManage) return;
      // eslint-disable-next-line no-alert -- confirm is intentional for quick disconnect
      const confirmDisconnect = window.confirm(
        `Disconnect ${provider === "slack" ? "Slack" : "Notion"} from this workspace?`
      );
      if (!confirmDisconnect) return;

      try {
        setPendingProvider(provider);
        const response = await fetch(`/api/integrations/${provider}/disconnect`, {
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || `Failed to disconnect ${provider}`);
        }
        toast.success(payload?.message || `${provider} disconnected`);
        await fetchStatus();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to disconnect ${provider}`);
      } finally {
        setPendingProvider(null);
      }
    },
    [canManage, fetchStatus]
  );

  const integrations = useMemo(() => {
    const slack = status?.integrations?.slack;
    const notion = status?.integrations?.notion;
    return [
      {
        key: "notion" as const,
        name: "Notion",
        connected: notion?.connected ?? false,
        status: notion?.status ?? "NOT_CONNECTED",
        workspaceName: notion?.workspaceName,
        lastError: notion?.lastError,
        reconnectRequired: notion?.reconnectRequired ?? false,
        connectHref: "/api/integrations/notion/oauth/authorize?next=/settings/integrations",
      },
      {
        key: "slack" as const,
        name: "Slack",
        connected: slack?.connected ?? false,
        status: slack?.status ?? "NOT_CONNECTED",
        workspaceName: slack?.workspaceName,
        lastError: slack?.lastError,
        reconnectRequired: slack?.reconnectRequired ?? false,
        connectHref: "/api/integrations/slack/oauth/authorize?next=/settings/integrations",
      },
    ];
  }, [status]);

  const slackStatusBadgeClass = (statusValue: string) => {
    if (statusValue === "EXECUTED") return "bg-emerald-100 text-emerald-700";
    if (statusValue === "FAILED") return "bg-red-100 text-red-700";
    if (statusValue === "REJECTED") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <SettingsLayout
      current="/settings/integrations"
      title="Integrations & Automations"
      description="Connect your tools and automate your workflow"
    >
      <div className="space-y-4 min-w-0">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Connection control center</h3>
              <p className="mt-1 text-sm text-blue-700">
                Connect, reconnect, or disconnect Slack and Notion for this workspace.
              </p>
            </div>
          </div>

          {!canManage && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <p className="text-sm">
                You can view connection status. Only workspace Owner/Admin can connect or disconnect
                integrations.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 min-w-0">
              {integrations.map((integration) => {
                const isPending = pendingProvider === integration.key;
                const reconnect = integration.reconnectRequired || integration.status === "ERROR";
                const badgeLabel = integration.connected
                  ? "Connected"
                  : reconnect
                    ? "Reconnect required"
                    : "Not connected";
                const badgeClass = integration.connected
                  ? "bg-green-100 text-green-700"
                  : reconnect
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700";
                return (
                  <div
                    key={integration.key}
                    className="rounded-lg border border-slate-200 p-4 min-w-0 flex flex-col"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h3 className="text-base font-semibold truncate">{integration.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600 min-w-0">
                      <p className="truncate">Status: {integration.status}</p>
                      <p className="truncate">
                        Workspace: {integration.workspaceName || "Not available"}
                      </p>
                      {integration.lastError && (
                        <p className="text-amber-700 truncate">
                          Last error: {integration.lastError}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      {!integration.connected && (
                        <a href={integration.connectHref} className="inline-block w-full sm:w-auto">
                          <Button size="sm" disabled={!canManage} className="w-full sm:w-auto">
                            <Link2 className="mr-1 h-4 w-4" />
                            {canManage ? `Connect ${integration.name}` : "Owner/Admin required"}
                          </Button>
                        </a>
                      )}
                      {integration.connected && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <a href={integration.connectHref}>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canManage || isPending}
                              >
                                {reconnect ? "Reconnect" : "Refresh connection"}
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!canManage || isPending}
                              onClick={() => runDisconnect(integration.key)}
                              title="Disconnect"
                              aria-label={`Disconnect ${integration.name}`}
                              className="shrink-0"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Automation shortcuts</h3>
          <p className="mt-1 text-sm text-slate-600">
            Use Automation Hub for imports, rules, and data-source level controls.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/automation">
              <Button variant="outline">Open Automation Hub</Button>
            </Link>
            <Link href="/settings/integrations/history">
              <Button variant="outline">View import history</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">Slack command activity</h3>
              <p className="mt-1 text-sm text-slate-600">
                Track what Slack created, command outcomes, and linked invoices.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchSlackActivity}
              disabled={activityLoading}
              className="shrink-0 w-full sm:w-auto"
            >
              {activityLoading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Refreshing
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {activityLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : slackActivity ? (
            <div className="mt-5 space-y-4 min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
                <div className="rounded-lg border border-slate-200 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">
                    Commands ({slackActivity.summary.rangeDays}d)
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {slackActivity.summary.totalCommands}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">Create Commands</p>
                  <p className="mt-1 text-xl font-semibold">
                    {slackActivity.summary.createCommands}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">Success Rate</p>
                  <p className="mt-1 text-xl font-semibold">{slackActivity.summary.successRate}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 min-w-0">
                  <p className="text-xs text-slate-500 truncate">Invoices from Slack</p>
                  <p className="mt-1 text-xl font-semibold">
                    {slackActivity.invoices.totalSlackCreated}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
                  Recent Slack commands
                </div>
                {slackActivity.commands.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No Slack commands captured yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {slackActivity.commands.map((command) => (
                      <div
                        key={command.id}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] ${slackStatusBadgeClass(command.status)}`}
                            >
                              {command.status}
                            </Badge>
                            <span className="text-xs uppercase text-slate-500">
                              {command.command}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-800">
                            {command.rawText || "No command text captured"}
                          </p>
                          {command.errorMessage ? (
                            <p className="mt-1 text-xs text-red-600">{command.errorMessage}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{new Date(command.createdAt).toLocaleString("en-IN")}</span>
                          {command.invoice ? (
                            <Link
                              href={`/invoices/new?id=${command.invoice.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {command.invoice.number}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Slack activity is unavailable right now.
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
