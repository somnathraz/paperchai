"use client";

import { useEffect } from "react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { IntegrationProvider, useIntegration, useActiveTab } from "@/lib/hooks/use-integration";
import { IntegrationTabs } from "@/components/integrations/integration-tabs";
import { ConnectionsTab } from "@/components/integrations/connections-tab";
import { AutomationTab } from "@/components/integrations/automation-tab";
import { ActivityTab } from "@/components/integrations/activity-tab";
import { Loader2 } from "lucide-react";

function IntegrationsContent() {
  const { state, fetchStatus } = useIntegration();
  const activeTab = useActiveTab();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <>
      <IntegrationTabs />

      {activeTab === "connections" && <ConnectionsTab />}
      {activeTab === "automation" && <AutomationTab />}
      {activeTab === "activity" && <ActivityTab />}
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <SettingsLayout
      current="/settings/integrations"
      title="Integrations"
      description="Connect your tools and automate your workflow"
    >
      <IntegrationProvider>
        <IntegrationsContent />
      </IntegrationProvider>
    </SettingsLayout>
  );
}
