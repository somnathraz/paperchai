import { DashboardState } from "@/features/dashboard/lib/get-dashboard-state";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, Clock, PauseCircle, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  state: DashboardState;
  userId: string;
};

export async function ActionView({ state, userId }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  if (!user?.activeWorkspaceId) return null;

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      workspaceId: user.activeWorkspaceId,
      status: "overdue",
    },
    include: {
      client: true,
      reminders: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    take: 3,
    orderBy: { dueDate: "asc" }, // Oldest first
  });

  const overdueAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(state.meta.totalOverdueAmount);

  const nextReminder = state.meta.nextReminderAt
    ? new Date(state.meta.nextReminderAt).toLocaleDateString()
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Urgency Hero */}
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100 animate-pulse">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-red-700">
            {overdueAmount} is overdue
          </h2>
          <p className="font-medium text-red-900/80 max-w-md mx-auto">
            across {state.meta.overdueCount}{" "}
            {state.meta.overdueCount === 1 ? "invoice" : "invoices"}.
          </p>
          <p className="text-muted-foreground text-sm">
            We recommend sending a reminder or pausing automation if you&apos;ve already spoken.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="destructive" asChild>
            <Link href="/invoices?status=overdue">Review overdue invoices</Link>
          </Button>
        </div>
      </div>

      {/* 2. Autopilot Actions */}
      <Card className="p-4 bg-red-50/20 border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-full text-red-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Automation Status</h3>
            {state.meta.remindersEnabled ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
                Active.{" "}
                {nextReminder ? `Next reminder: ${nextReminder}` : "No immediate reminders."}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                Paused.
              </div>
            )}
          </div>
        </div>

        {state.meta.remindersEnabled ? (
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            <PauseCircle className="h-4 w-4 mr-2" />
            Pause reminders
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <PlayCircle className="h-4 w-4 mr-2" />
            Resume
          </Button>
        )}
      </Card>

      {/* 3. Overdue List Preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Priority Items
        </h3>
        <div className="divide-y divide-border border rounded-xl bg-card shadow-sm">
          {overdueInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <div className="font-medium">{inv.client.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    #{inv.number}
                  </span>
                  • Due {inv.dueDate ? inv.dueDate.toLocaleDateString() : "Unknown"}
                </div>
                {inv.reminders?.[0] && (
                  <div className="text-xs text-blue-600 mt-1">
                    Last reminded: {inv.reminders[0].sentAt.toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                <div className="text-right font-semibold">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: inv.currency,
                    maximumFractionDigits: 0,
                  }).format(Number(inv.total))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  asChild
                >
                  <Link href={`/invoices/${inv.id}/remind`}>Send Reminder</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
