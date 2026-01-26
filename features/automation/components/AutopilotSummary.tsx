"use client";

import { memo } from "react";
import { Zap, Activity, TrendingUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutomation } from "../hooks/useAutomation";

type AutopilotStatus = "ON" | "PARTIAL" | "OFF";

interface AutopilotMetrics {
  invoicesCovered: number;
  totalInvoices: number;
  last30DaysCollected: number;
  avgDaysFaster: number;
  status: AutopilotStatus;
}

const StatusBadge = memo(function StatusBadge({ status }: { status: AutopilotStatus }) {
  const config = {
    ON: {
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      label: "🟢 Autopilot ON",
    },
    PARTIAL: {
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      label: "🟡 Partial",
    },
    OFF: {
      color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      label: "⚪ Autopilot OFF",
    },
  }[status];

  return (
    <Badge variant="outline" className={`${config.color} border-0 font-medium`}>
      {config.label}
    </Badge>
  );
});

const MetricCard = memo(function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-background">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
});

export const AutopilotSummary = memo(function AutopilotSummary({
  onCreateAutomation,
  onViewActivity,
}: {
  onCreateAutomation?: () => void;
  onViewActivity?: () => void;
}) {
  const { integrationStatus, isLoading } = useAutomation();

  // Use autopilot field from enhanced API, fallback to legacy stats
  const autopilot = integrationStatus?.autopilot;
  const legacyStats = integrationStatus?.stats;

  const metrics: AutopilotMetrics = {
    invoicesCovered: autopilot?.invoicesCovered ?? legacyStats?.invoicesCovered ?? 0,
    totalInvoices: autopilot?.totalInvoices ?? legacyStats?.totalInvoices ?? 0,
    last30DaysCollected: autopilot?.last30DaysCollected ?? legacyStats?.last30DaysCollected ?? 0,
    avgDaysFaster: autopilot?.avgDaysFaster ?? legacyStats?.avgDaysFaster ?? 0,
    status:
      autopilot?.status ??
      (integrationStatus?.integrations?.notion?.connected ||
      integrationStatus?.integrations?.slack?.connected
        ? "ON"
        : "OFF"),
  };

  return (
    <Card className="overflow-hidden border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20">
      <div className="p-4 sm:p-6">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          {/* Left: Title, Subtitle, Status */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">Money Autopilot</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              PaperChai chases your invoices so you don&apos;t have to.
            </p>
            <div className="pt-1">
              <StatusBadge status={metrics.status} />
            </div>
          </div>

          {/* Right: Metrics (2x2 grid on mobile, row on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 lg:min-w-[600px]">
            <MetricCard
              icon={Activity}
              label="Invoices covered"
              value={`${metrics.invoicesCovered} / ${metrics.totalInvoices}`}
            />
            <MetricCard
              icon={TrendingUp}
              label="Last 30 days collected"
              value={`₹${metrics.last30DaysCollected.toLocaleString()}`}
            />
            <MetricCard
              icon={Clock}
              label="Avg days faster"
              value={metrics.avgDaysFaster.toFixed(1)}
            />
            <MetricCard icon={Zap} label="Status" value={metrics.status} />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-violet-200 dark:border-violet-800">
          <Button
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
            size="default"
            onClick={onCreateAutomation}
          >
            <Zap className="w-4 h-4 mr-2" />
            Create Automation
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            size="default"
            onClick={onViewActivity}
          >
            View Activity Log
          </Button>
        </div>
      </div>
    </Card>
  );
});
