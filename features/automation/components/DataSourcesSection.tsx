"use client";

import { memo, useState } from "react";
import { Database, MessageSquare, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutomation } from "../hooks/useAutomation";
import { NotionDatabasesDialog } from "./NotionDatabasesDialog";
import { toast } from "sonner";

interface IntegrationTileProps {
  name: string;
  icon: React.ElementType;
  iconBgColor: string;
  connected: boolean;
  status?: string;
  lastError?: string | null;
  canManage?: boolean;
  noSharedDocs?: boolean;
  stats?: {
    databasesMapped?: number;
    clientsImported?: number;
    projectsImported?: number;
    channelsWatching?: string[];
    threadsToProjects?: number;
    draftInvoices?: number;
  };
  description: string[];
  onConnect?: () => void;
  onConfigure?: () => void;
  onViewImports?: () => void;
  onDisconnect?: () => void;
  comingSoon?: boolean;
}

const IntegrationTile = memo(function IntegrationTile({
  name,
  icon: Icon,
  iconBgColor,
  connected,
  stats,
  description,
  onConnect,
  onConfigure,
  onViewImports,
  onDisconnect,
  comingSoon,
  status,
  lastError,
  canManage = true,
  noSharedDocs = false,
}: IntegrationTileProps) {
  const errorText = (lastError || "").toLowerCase();
  const permissionIssue =
    errorText.includes("permission") ||
    errorText.includes("restricted") ||
    errorText.includes("share");
  const needsReconnect =
    status === "ERROR" || errorText.includes("token") || errorText.includes("expired");
  const badgeLabel = needsReconnect
    ? "Needs Reconnect"
    : permissionIssue
      ? "Permission Missing"
      : noSharedDocs
        ? "No Shared Docs"
        : connected
          ? "Connected"
          : comingSoon
            ? "Coming Soon"
            : status === "DISCONNECTED"
              ? "Disconnected"
              : "Not Connected";
  const badgeClass =
    needsReconnect || permissionIssue || noSharedDocs
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : connected
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        : comingSoon
          ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{name}</h3>
        </div>
        <Badge variant="outline" className={`${badgeClass} border-0`}>
          {badgeLabel}
        </Badge>
      </div>

      {/* Stats or Description */}
      {connected && stats ? (
        <div className="space-y-2 mb-4">
          {lastError && <p className="text-xs text-amber-700 dark:text-amber-300">{lastError}</p>}
          {stats.databasesMapped !== undefined && (
            <p className="text-sm text-muted-foreground">
              {stats.databasesMapped} databases mapped
            </p>
          )}
          {stats.clientsImported !== undefined && stats.projectsImported !== undefined && (
            <p className="text-sm text-muted-foreground">
              {stats.clientsImported} clients · {stats.projectsImported} projects imported
            </p>
          )}
          {stats.channelsWatching && stats.channelsWatching.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Watching: {stats.channelsWatching.join(", ")}
            </p>
          )}
          {stats.threadsToProjects !== undefined && stats.draftInvoices !== undefined && (
            <p className="text-sm text-muted-foreground">
              {stats.threadsToProjects} threads → projects · {stats.draftInvoices} draft invoices
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-1 mb-4">
          {description.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {!connected && !comingSoon && (
          <Button
            onClick={onConnect}
            disabled={!canManage}
            className="w-full sm:flex-1 bg-violet-600 hover:bg-violet-700"
          >
            {canManage ? `Connect ${name}` : "Owner/Admin required"}
          </Button>
        )}
        {connected && (
          <>
            <Button
              onClick={onConfigure}
              disabled={!canManage}
              variant="default"
              className="w-full sm:flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {!canManage
                ? "Owner/Admin required"
                : name === "Notion"
                  ? "Map databases"
                  : "Configure automations"}
            </Button>
            <Button onClick={onViewImports} variant="outline" className="w-full sm:flex-1">
              View imports
            </Button>
            <Button
              onClick={onDisconnect}
              disabled={!canManage}
              variant="destructive"
              className="w-full sm:flex-1"
            >
              {canManage ? "Disconnect" : "Owner/Admin required"}
            </Button>
          </>
        )}
        {comingSoon && (
          <Button disabled variant="outline" className="w-full">
            Coming Soon
          </Button>
        )}
      </div>
    </Card>
  );
});

export const DataSourcesSection = memo(function DataSourcesSection() {
  const { integrationStatus, isLoading, refreshData } = useAutomation();
  const [notionDialogOpen, setNotionDialogOpen] = useState(false);

  const notionConnected = integrationStatus?.integrations?.notion?.connected ?? false;
  const slackConnected = integrationStatus?.integrations?.slack?.connected ?? false;
  const canManageIntegrations = integrationStatus?.canManageIntegrations ?? false;

  const disconnectIntegration = async (provider: "notion" | "slack") => {
    if (!canManageIntegrations) return;
    // eslint-disable-next-line no-alert -- confirm is intentional for disconnect
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

  if (isLoading && !integrationStatus) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Data Sources & Imports</h2>
        <p className="text-sm text-muted-foreground">Connect where your work already lives.</p>
        <Card className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Data Sources & Imports</h2>
        <p className="text-sm text-muted-foreground">Connect where your work already lives.</p>
        {!canManageIntegrations && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            You can view status/imports. Only workspace owner/admin can connect or configure
            integrations.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Notion Tile */}
        <IntegrationTile
          name="Notion"
          icon={Database}
          iconBgColor="bg-black"
          connected={notionConnected}
          status={integrationStatus?.integrations?.notion?.status}
          lastError={integrationStatus?.integrations?.notion?.lastError}
          canManage={canManageIntegrations}
          noSharedDocs={
            notionConnected &&
            (integrationStatus?.integrations?.notion?.databasesMapped || 0) === 0 &&
            (integrationStatus?.integrations?.notion?.clientsImported || 0) === 0 &&
            (integrationStatus?.integrations?.notion?.projectsImported || 0) === 0 &&
            !integrationStatus?.integrations?.notion?.lastError
          }
          stats={
            notionConnected
              ? {
                  databasesMapped: integrationStatus?.integrations?.notion?.databasesMapped || 0,
                  clientsImported: integrationStatus?.integrations?.notion?.clientsImported || 0,
                  projectsImported: integrationStatus?.integrations?.notion?.projectsImported || 0,
                }
              : undefined
          }
          description={[
            "• Auto-import from databases",
            "• Extract milestones from agreements",
            "• Draft invoices from pages",
          ]}
          onConnect={() =>
            (window.location.href = "/api/integrations/notion/oauth/authorize?next=/automation")
          }
          onConfigure={() => setNotionDialogOpen(true)}
          onViewImports={() => (window.location.href = "/settings/integrations/history")}
          onDisconnect={() => disconnectIntegration("notion")}
        />

        {/* Slack Tile */}
        <IntegrationTile
          name="Slack"
          icon={MessageSquare}
          iconBgColor="bg-[#4A154B]"
          connected={slackConnected}
          status={integrationStatus?.integrations?.slack?.status}
          lastError={integrationStatus?.integrations?.slack?.lastError}
          canManage={canManageIntegrations}
          stats={
            slackConnected
              ? {
                  channelsWatching: integrationStatus?.integrations?.slack?.channelsWatching || [],
                  threadsToProjects: integrationStatus?.integrations?.slack?.threadsToProjects || 0,
                  draftInvoices: integrationStatus?.integrations?.slack?.draftInvoices || 0,
                }
              : undefined
          }
          description={[
            "• Create invoices from threads",
            "• Get real-time notifications",
            "• Use slash commands",
          ]}
          onConnect={() =>
            (window.location.href = "/api/integrations/slack/oauth/authorize?next=/automation")
          }
          onConfigure={() => (window.location.href = "/settings/integrations")}
          onViewImports={() => (window.location.href = "/settings/integrations/history")}
          onDisconnect={() => disconnectIntegration("slack")}
        />

        {/* WhatsApp Tile */}
        <IntegrationTile
          name="WhatsApp Business"
          icon={MessageSquare}
          iconBgColor="bg-green-600"
          connected={false}
          description={["Use WhatsApp Business for high-urgency reminders."]}
          comingSoon
        />
      </div>

      {/* Notion Databases Dialog */}
      <NotionDatabasesDialog open={notionDialogOpen} onClose={() => setNotionDialogOpen(false)} />
    </div>
  );
});
