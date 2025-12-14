
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationPipeline } from "@/features/automation/components/pipeline";
import { AutomationRules } from "@/features/automation/components/rules";
import { ClientInsights } from "@/features/automation/components/client-insights";
import { ActivityFeed } from "@/features/automation/components/activity-feed";
import { SettingsSummary } from "@/features/automation/components/settings-summary";
import { RevenueImpact } from "@/features/automation/components/revenue-impact";
import { IntegrationRecommendations } from "@/features/automation/components/IntegrationRecommendations";
import { RunningAutomations } from "@/features/automation/components/RunningAutomations";

export default async function AutomationPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login?callbackUrl=/automation");
    }

    return (
        <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
            <div className="space-y-8 pt-2 sm:pt-0">
                <div className="space-y-1 px-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Strategy & Rules</p>
                    <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Autopilot Engine</h1>
                    <p className="text-muted-foreground">
                        Configure your automation strategy, view AI insights, and track revenue impact.
                    </p>
                </div>

                {/* Integration Recommendations */}
                <div className="px-4">
                    <IntegrationRecommendations />
                </div>

                <AutomationPipeline />

                <div className="grid gap-8 grid-cols-1 xl:grid-cols-[2fr_1fr]">
                    <div className="space-y-8">
                        <AutomationRules />

                        {/* Running Integration Automations */}
                        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
                            <h2 className="text-lg font-semibold mb-4">Integration Automations</h2>
                            <RunningAutomations />
                        </div>

                        <ClientInsights />
                        <ActivityFeed />
                    </div>
                    <div className="space-y-8">
                        <RevenueImpact />
                        <SettingsSummary />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
