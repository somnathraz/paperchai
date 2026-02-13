"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { CheckCircle2, AlertCircle, Loader2, Unplug, Link2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { StatusResponse } from "@/lib/hooks/use-integration";

type ProviderKey = "slack" | "notion";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<ProviderKey | null>(null);

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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
        connectHref: "/api/integrations/notion/oauth/authorize?next=/settings/integrations",
      },
      {
        key: "slack" as const,
        name: "Slack",
        connected: slack?.connected ?? false,
        status: slack?.status ?? "NOT_CONNECTED",
        workspaceName: slack?.workspaceName,
        lastError: slack?.lastError,
        connectHref: "/api/integrations/slack/oauth/authorize?next=/settings/integrations",
      },
    ];
  }, [status]);

  return (
    <SettingsLayout
      current="/settings/integrations"
      title="Integrations & Automations"
      description="Connect your tools and automate your workflow"
    >
      <div className="space-y-4">
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
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => {
                const isPending = pendingProvider === integration.key;
                const reconnect = integration.connected && integration.status === "ERROR";
                return (
                  <div key={integration.key} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">{integration.name}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          integration.connected
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {integration.connected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>Status: {integration.status}</p>
                      <p>Workspace: {integration.workspaceName || "Not available"}</p>
                      {integration.lastError && (
                        <p className="text-amber-700">Last error: {integration.lastError}</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!integration.connected && (
                        <a href={integration.connectHref}>
                          <Button size="sm" disabled={!canManage}>
                            <Link2 className="mr-1 h-4 w-4" />
                            {canManage ? `Connect ${integration.name}` : "Owner/Admin required"}
                          </Button>
                        </a>
                      )}
                      {integration.connected && (
                        <>
                          <a href={integration.connectHref}>
                            <Button size="sm" variant="outline" disabled={!canManage || isPending}>
                              {reconnect ? "Reconnect" : "Refresh connection"}
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!canManage || isPending}
                            onClick={() => runDisconnect(integration.key)}
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Disconnecting...
                              </>
                            ) : (
                              <>
                                <Unplug className="mr-1 h-4 w-4" />
                                Disconnect
                              </>
                            )}
                          </Button>
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
      </div>
    </SettingsLayout>
  );
}
