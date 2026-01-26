"use client";

import { memo } from "react";
import { Zap, Database, MessageSquare, ArrowRight, Clock, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AutopilotBannerProps {
  isConfigured: boolean;
  metrics?: {
    collected30Days?: number;
    hoursSaved?: number;
    daysFaster?: number;
  };
  integrations?: {
    notionConnected?: boolean;
    slackConnected?: boolean;
  };
}

const NotConfiguredBanner = memo(function NotConfiguredBanner({
  integrations,
}: {
  integrations?: AutopilotBannerProps["integrations"];
}) {
  const notionConnected = integrations?.notionConnected ?? false;
  const slackConnected = integrations?.slackConnected ?? false;

  return (
    <Card className="p-4 sm:p-6 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
            <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Turn on Money Autopilot</h3>
            <p className="text-sm text-muted-foreground">
              Connect Notion or Slack and let PaperChai track billable work + send reminders.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
          {!notionConnected && (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a href="/api/integrations/notion/oauth/authorize?next=/dashboard">
                <Database className="w-4 h-4 mr-2" />
                Connect Notion
              </a>
            </Button>
          )}
          {!slackConnected && (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a href="/api/integrations/slack/oauth/authorize?next=/dashboard">
                <MessageSquare className="w-4 h-4 mr-2" />
                Connect Slack
              </a>
            </Button>
          )}
          <Button asChild size="sm" className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700">
            <Link href="/automation">
              Set up reminders
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
});

const RunningBanner = memo(function RunningBanner({
  metrics,
}: {
  metrics?: AutopilotBannerProps["metrics"];
}) {
  const collected = metrics?.collected30Days ?? 0;
  const hoursSaved = metrics?.hoursSaved ?? 0;
  const daysFaster = metrics?.daysFaster ?? 0;

  return (
    <Card className="p-4 sm:p-6 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              Autopilot at work
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Active
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Last 30 days: chasing invoices and collecting payments automatically.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex flex-wrap gap-4 sm:gap-6 sm:ml-auto">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
              <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">₹{collected.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
              <Clock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">{hoursSaved} hrs</p>
              <p className="text-xs text-muted-foreground">Saved</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold">{daysFaster.toFixed(1)} days</p>
              <p className="text-xs text-muted-foreground">Faster</p>
            </div>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full sm:w-auto border-green-300 dark:border-green-700"
        >
          <Link href="/automation">
            View automations
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </Card>
  );
});

export const AutopilotBanner = memo(function AutopilotBanner({
  isConfigured,
  metrics,
  integrations,
}: AutopilotBannerProps) {
  if (isConfigured) {
    return <RunningBanner metrics={metrics} />;
  }

  return <NotConfiguredBanner integrations={integrations} />;
});
