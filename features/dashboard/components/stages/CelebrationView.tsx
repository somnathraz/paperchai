import { DashboardState } from "@/features/dashboard/lib/get-dashboard-state";
import { PartyPopper, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RemindersTimeline } from "@/components/dashboard/reminders-timeline";

type Props = {
  state: DashboardState;
};

export function CelebrationView({ state }: Props) {
  // Logic for Celebration View (State E)
  // 1. Reward: You got paid.
  // 2. Light Insights: Avg time to pay (if available).
  // 3. Autopilot running.

  // We need to fetch the recent payment details if possible, or just celebrate the count.
  // For now, generic celebration.

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      {/* 1. Celebrate Outcome */}
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
          <PartyPopper className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-800">You got paid!</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Great job. Your invoice system is working. Money is flowing in.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/invoices/new">Create next invoice</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/invoices?status=paid">View paid invoices</Link>
          </Button>
        </div>
      </div>

      {/* 2. Light Insights (if we have data) */}
      {state.meta.paidCount >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
          <Card className="p-4 flex items-center gap-4 border-emerald-100 bg-emerald-50/20">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              <p className="text-xl font-bold text-foreground">
                {state.meta.paidCount} {state.meta.paidCount === 1 ? "payment" : "payments"}
              </p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Step</p>
              <p className="text-sm font-medium text-foreground">Keep the momentum going.</p>
            </div>
          </Card>
        </div>
      )}

      {/* 4. Autopilot Running / Recent Invoices (Light) */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h3>
        <RemindersTimeline />
      </div>
    </div>
  );
}
