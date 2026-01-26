"use client";

import { StatsCards } from "@/features/dashboard/components/StatsCards";
import { CashflowWidget } from "@/features/dashboard/components/CashflowWidget";
import { IntegrationPanel } from "@/components/dashboard/integration-panel";
import { IntegrationProvider } from "@/lib/hooks/use-integration";
import { AutopilotBannerWidget } from "@/features/automation/components/AutopilotBannerWidget";
import { ActivityWidget } from "@/features/dashboard/components/ActivityWidget";

export function InsightsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Financial Insights</h2>
        <p className="text-muted-foreground text-sm">
          Your business is running on autopilot. Here is how it is performing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Autopilot Banner */}
          <AutopilotBannerWidget />

          {/* Key Metrics */}
          <StatsCards />

          {/* Cashflow Logic */}
          <CashflowWidget />

          {/* Activity Feed */}
          <ActivityWidget />
        </div>

        {/* Sidebar Column - 1/3 width */}
        <div className="space-y-6">
          {/* Integrations */}
          <IntegrationProvider>
            <IntegrationPanel />
          </IntegrationProvider>

          {/* Add more widgets here like Reliability or Client Health */}
        </div>
      </div>
    </div>
  );
}
