"use client";

import { useEffect } from "react";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Stub components for missing tabs to fix build
// Logic should be migrated to proper features/integrations in future
function ConnectionsTab() {
  return (
    <div className="py-8 text-center text-slate-500">
      <p>Manage your connections in the new Automation Hub.</p>
      <Link href="/automation">
        <Button variant="outline" className="mt-4">Go to Automation Hub</Button>
      </Link>
    </div>
  );
}

function AutomationTab() {
  return (
    <div className="py-8 text-center text-slate-500">
      <p>Automations have moved to the new Automation Hub.</p>
      <Link href="/automation">
        <Button variant="outline" className="mt-4">Go to Automation Hub</Button>
      </Link>
    </div>
  );
}

function ActivityTab() {
  return (
    <div className="py-8 text-center text-slate-500">
      <p>Activity logs are available in the Automation Hub.</p>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <SettingsLayout
      current="/settings/integrations"
      title="Integrations & Automations"
      description="Connect your tools and automate your workflow"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">We&apos;ve upgraded Automations!</h3>
            <p className="mt-1 text-sm text-blue-700">
              Integration and Automation settings have been moved to a dedicated Automation Hub for better management and visibility.
            </p>
            <Link href="/automation">
              <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700">
                Open Automation Hub
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="opacity-60 pointer-events-none grayscale">
            <ConnectionsTab />
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
