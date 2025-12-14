import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { DashboardTabNav } from "@/components/dashboard/dashboard-tabs";
import { FabActions } from "@/components/dashboard/fab-actions";
import { generateMetadata as genMeta } from "@/lib/seo-config";

export const metadata = genMeta({
  title: "Dashboard - Invoice Management",
  description:
    "Your freelance invoice command center. View unpaid invoices, client reliability scores, payment reminders, and cash flow insights.",
  path: "/dashboard",
  noIndex: true,
});

// Import all server components
import { StatsCards } from "@/features/dashboard/components/StatsCards";
import { CashflowWidget } from "@/features/dashboard/components/CashflowWidget";
import { AutomationLifecycle } from "@/components/dashboard/automation-lifecycle";
import { RemindersTimeline } from "@/components/dashboard/reminders-timeline";
import { InvoiceTableWidget } from "@/features/dashboard/components/InvoiceTableWidget";
import { ReliabilityRadar } from "@/components/dashboard/reliability-radar";
import { ReliabilityTable } from "@/components/dashboard/reliability-table";
import { ClientHealth } from "@/components/dashboard/client-health";
import { ActivityWidget } from "@/features/dashboard/components/ActivityWidget";
import { Insights } from "@/components/dashboard/insights";
import { IntegrationPanel } from "@/components/dashboard/integration-panel";
import { IntegrationProvider } from "@/lib/hooks/use-integration";

type Props = {
  searchParams: { tab?: string };
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const firstName =
    session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "there";
  const activeTab = searchParams.tab || "overview";

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      {/* Mobile-first centered container */}
      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 sm:pt-6 lg:px-8">
        {/* Responsive Header: Stacked on mobile, Flex on desktop */}
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Dashboard</p>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Money autopilot is live. Track payouts, reliability, and reminders.
            </p>
          </div>
          {/* Add dashboard-level actions here if needed */}
        </div>

        {/* Tab Navigation */}
        <DashboardTabNav activeTab={activeTab} />

        {/* Tab Content - Server Components */}
        <div className="min-h-[500px] px-4 sm:px-0">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <StatsCards />
              <IntegrationProvider>
                <IntegrationPanel />
              </IntegrationProvider>
              <CashflowWidget />
            </div>
          )}

          {activeTab === "automation" && (
            <div className="space-y-6">
              <AutomationLifecycle />
              <RemindersTimeline />
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-6">
              <InvoiceTableWidget />
              <ReliabilityTable />
            </div>
          )}

          {activeTab === "clients" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ReliabilityRadar />
                <ClientHealth />
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ActivityWidget />
                <Insights />
              </div>
            </div>
          )}
        </div>
      </div>
      <FabActions />
    </DashboardLayout>
  );
}
