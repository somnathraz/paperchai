import { DashboardState } from "@/features/dashboard/lib/get-dashboard-state";
import { RemindersTimeline } from "@/components/dashboard/reminders-timeline";
import { Plane, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Props = {
  state: DashboardState;
};

export function WaitingView({ state }: Props) {
  const pendingAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(state.meta.totalUnpaidAmount);

  const sentCount = state.meta.sentCount;
  const nextReminder = state.meta.nextReminderAt
    ? new Date(state.meta.nextReminderAt).toLocaleDateString()
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Money/Status Hero */}
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 shadow-sm">
          <Plane className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">{pendingAmount} is in flight</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            across {sentCount} {sentCount === 1 ? "invoice" : "invoices"}.
            {state.meta.latestInvoice && (
              <span>
                {" "}
                Most recent sent to{" "}
                <span className="font-medium text-foreground">
                  {state.meta.latestInvoice.clientName}
                </span>
                .
              </span>
            )}
          </p>
        </div>

        {/* Primary CTA */}
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link
            href={
              state.meta.latestInvoice
                ? `/invoices/new?id=${state.meta.latestInvoice.id}`
                : "/invoices"
            }
          >
            View invoice status
          </Link>
        </Button>
      </div>

      {/* 2. Autopilot Proof Block - Only show if reminders are NOT enabled */}
      {!state.meta.remindersEnabled && (
        <Card className="p-0 overflow-hidden border-blue-100 bg-blue-50/10">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg mt-1">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Automate Your Collections</h3>
                <p className="text-sm text-muted-foreground">
                  Reminders are currently disabled. Enable them to get paid faster.
                </p>
              </div>
            </div>

            <Button size="sm" variant="secondary" className="whitespace-nowrap" asChild>
              <Link href="/automation">Enable Reminders</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* 3. Recent Activity (Light) */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h3>
        <RemindersTimeline />
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/invoices/new">Create another invoice</Link>
        </Button>
      </div>
    </div>
  );
}
