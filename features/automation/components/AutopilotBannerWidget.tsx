"use client";

import { useAutomation } from "@/features/automation/hooks/useAutomation";
import { AutopilotBanner } from "@/features/automation/components/AutopilotBanner";
import { Skeleton } from "@/components/ui/skeleton";

export function AutopilotBannerWidget() {
  const { integrationStatus, isLoading } = useAutomation();

  if (isLoading && !integrationStatus) {
    return (
      <div className="h-20 rounded-lg">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const notionConnected = integrationStatus?.integrations?.notion?.connected ?? false;
  const slackConnected = integrationStatus?.integrations?.slack?.connected ?? false;
  const isConfigured = notionConnected || slackConnected;

  return (
    <AutopilotBanner
      isConfigured={isConfigured}
      metrics={{
        collected30Days: integrationStatus?.stats?.last30DaysCollected ?? 0,
        hoursSaved: 6, // Would come from API
        daysFaster: integrationStatus?.stats?.avgDaysFaster ?? 0,
      }}
      integrations={{
        notionConnected,
        slackConnected,
      }}
    />
  );
}
