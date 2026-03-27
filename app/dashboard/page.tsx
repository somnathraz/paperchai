import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { DashboardTabNav } from "@/components/dashboard/dashboard-tabs";
import { FabActions } from "@/components/dashboard/fab-actions";

// Import all dashboard components
import { AutomationLifecycle } from "@/components/dashboard/automation-lifecycle";
import { RemindersTimeline } from "@/components/dashboard/reminders-timeline";
import { InvoiceTableWidget } from "@/features/dashboard/components/InvoiceTableWidget";
import { ReliabilityRadar } from "@/components/dashboard/reliability-radar";
import { ReliabilityTable } from "@/components/dashboard/reliability-table";
import { ClientHealth } from "@/components/dashboard/client-health";
import { ActivityWidget } from "@/features/dashboard/components/ActivityWidget";
import { Insights } from "@/components/dashboard/insights";
import { RecurringPlansSection } from "@/features/automation/components/RecurringPlansSection";

// New Stage Logic Imports (v2)
import { getDashboardState } from "@/features/dashboard/lib/get-dashboard-state";
import { SetupView } from "@/features/dashboard/components/stages/SetupView";
import { DraftView } from "@/features/dashboard/components/stages/DraftView";
import { WaitingView } from "@/features/dashboard/components/stages/WaitingView";
import { ActionView } from "@/features/dashboard/components/stages/ActionView";
import { CelebrationView } from "@/features/dashboard/components/stages/CelebrationView";
import { InsightsView } from "@/features/dashboard/components/stages/InsightsView";
import { OverviewV2Section } from "@/features/dashboard/components/OverviewV2Section";
import { ReceivablesSection } from "@/features/dashboard/components/ReceivablesSection";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = session.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const firstName =
    session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "there";
  const params = await searchParams;
  const activeTab = params.tab || "overview";

  // Calculate Dashboard State
  const dashboardState = await getDashboardState(userId);

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
              {dashboardState.stage === "NO_INVOICE_YET" &&
                "Let's get your financial engine running."}
              {dashboardState.stage === "INVOICE_CREATED_BUT_NOT_SENT" &&
                "You're almost there. Send your draft."}
              {dashboardState.stage === "SENT_WAITING_FOR_PAYMENT" &&
                "Your invoices are flying. We're tracking them."}
              {dashboardState.stage === "OVERDUE_EXISTS" && "Some items need your attention."}
              {dashboardState.stage === "FIRST_PAYMENT_RECEIVED" && "You're off to a great start."}
              {dashboardState.stage === "MATURE_USER" &&
                "Money autopilot is live. Track payouts and reliability."}
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
              <OverviewV2Section />

              {/* STRICT STATE MACHINE RENDERING */}
              {dashboardState.stage === "NO_INVOICE_YET" && <SetupView />}
              {dashboardState.stage === "INVOICE_CREATED_BUT_NOT_SENT" && (
                <DraftView state={dashboardState} />
              )}
              {dashboardState.stage === "SENT_WAITING_FOR_PAYMENT" && (
                <WaitingView state={dashboardState} />
              )}
              {dashboardState.stage === "OVERDUE_EXISTS" && (
                <ActionView state={dashboardState} userId={userId} />
              )}
              {dashboardState.stage === "FIRST_PAYMENT_RECEIVED" && (
                <CelebrationView state={dashboardState} />
              )}
              {dashboardState.stage === "MATURE_USER" && <InsightsView />}
            </div>
          )}

          {activeTab === "automation" && (
            <div className="space-y-6">
              <AutomationLifecycle />
              <RecurringPlansSection compact />
              <RemindersTimeline />
            </div>
          )}

          {activeTab === "receivables" && (
            <div className="space-y-6">
              <ReceivablesSection />
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
