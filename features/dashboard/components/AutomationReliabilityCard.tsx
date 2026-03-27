"use client";

import { Card } from "@/components/ui/card";

type AutomationHealth = {
  successRate7d: number;
  failedJobs24h: number;
  dueNext24h: number;
  remindersSent7d: number;
};

export function AutomationReliabilityCard({
  health,
  isLoading,
}: {
  health: AutomationHealth | null;
  isLoading: boolean;
}) {
  const score = health?.successRate7d ?? 0;
  const tone =
    score >= 90 ? "text-emerald-600" : score >= 75 ? "text-amber-600" : "text-destructive";

  return (
    <Card className="border-border/70 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Automation Reliability
      </p>
      {isLoading || !health ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted/50" />
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Success 7D
            </p>
            <p className={`mt-1 text-xl font-semibold ${tone}`}>{health.successRate7d}%</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Failed 24H
            </p>
            <p
              className={
                health.failedJobs24h > 0
                  ? "mt-1 text-xl font-semibold text-destructive"
                  : "mt-1 text-xl font-semibold"
              }
            >
              {health.failedJobs24h}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Due Next 24H
            </p>
            <p className="mt-1 text-xl font-semibold">{health.dueNext24h}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Reminders 7D
            </p>
            <p className="mt-1 text-xl font-semibold">{health.remindersSent7d}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
