"use client";

import Link from "next/link";
import { AlertTriangle, CheckSquare, Clock3, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type ActionQueueItem = {
  id: string;
  type: "approval" | "failed_schedule" | "overdue_no_reminder" | "draft_due_soon";
  priority: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

function iconForType(type: ActionQueueItem["type"]) {
  if (type === "approval") return CheckSquare;
  if (type === "failed_schedule") return AlertTriangle;
  if (type === "overdue_no_reminder") return Clock3;
  return Send;
}

export function ActionQueueCard({
  items,
  isLoading,
  error,
  onRetry,
}: {
  items: ActionQueueItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Card className="border-border/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Action Queue</p>
          <h3 className="mt-1 text-lg font-semibold">Needs action now</h3>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && (
          <>
            <div className="h-16 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-16 animate-pulse rounded-xl bg-muted/50" />
          </>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            No urgent actions. Automation is healthy.
          </div>
        )}

        {!isLoading &&
          !error &&
          items.map((item) => {
            const Icon = iconForType(item.type);
            return (
              <div key={item.id} className="rounded-xl border border-border/70 bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={item.ctaHref}>{item.ctaLabel}</Link>
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
