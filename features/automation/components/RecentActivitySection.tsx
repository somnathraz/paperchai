"use client";

import { memo, useEffect, useState } from "react";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Check,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, formatCurrency } from "../lib/automation-utils";

interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: string;
  entityId?: string;
  entityType?: string;
  channel?: string;
  status?: string;
}

const getActivityIcon = (type: string, channel?: string) => {
  switch (type) {
    case "reminder_sent":
      return channel === "whatsapp"
        ? {
            icon: MessageSquare,
            color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
          }
        : { icon: Mail, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" };
    case "reminder_failed":
      return {
        icon: AlertCircle,
        color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      };
    case "payment":
      return {
        icon: DollarSign,
        color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      };
    case "invoice":
      return {
        icon: FileText,
        color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
      };
    case "client":
      return {
        icon: UserPlus,
        color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      };
    default:
      return {
        icon: Clock,
        color: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
      };
  }
};

const ActivityIcon = memo(function ActivityIcon({
  type,
  channel,
}: {
  type: string;
  channel?: string;
}) {
  const { icon: Icon, color } = getActivityIcon(type, channel);

  return (
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
});

const ActivityRow = memo(function ActivityRow({
  item,
  onClick,
}: {
  item: ActivityItem;
  onClick?: (id: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer min-h-[56px]"
      onClick={() => onClick?.(item.entityId || item.id)}
    >
      <ActivityIcon type={item.type} channel={item.channel} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-sm font-medium">{item.title}</p>
          <span
            className="text-xs text-muted-foreground whitespace-nowrap"
            suppressHydrationWarning
          >
            {formatRelativeTime(new Date(item.timestamp))}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
        <Clock className="w-6 h-6 text-muted-foreground opacity-30" />
      </div>
      <p className="text-sm text-muted-foreground">
        No activity yet. Create invoices and enable reminders to see activity here.
      </p>
    </div>
  );
});

const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
});

const ErrorState = memo(function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">Failed to load activity.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
});

export const RecentActivitySection = memo(function RecentActivitySection({
  onViewAll,
  onActivityClick,
}: {
  onViewAll?: () => void;
  onActivityClick?: (id: string) => void;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/recent-activity");
      // Handle 401 as "no data" rather than error
      if (response.status === 401) {
        setActivities([]);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">Latest actions and automation runs.</p>
        </div>
        {activities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="hidden sm:flex min-h-[44px]"
          >
            View full log
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState onRetry={fetchActivity} />
          </div>
        ) : activities.length === 0 ? (
          <div className="p-6">
            <EmptyState />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.slice(0, 5).map((item) => (
              <ActivityRow key={item.id} item={item} onClick={onActivityClick} />
            ))}
          </div>
        )}
      </Card>

      {!isLoading && !error && activities.length > 0 && (
        <Button variant="outline" className="w-full sm:hidden min-h-[44px]" onClick={onViewAll}>
          View full log
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
});
