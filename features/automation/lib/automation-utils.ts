import { Mail, MessageSquare, Database, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type AutomationStatus =
  | "ACTIVE"
  | "PENDING"
  | "PAUSED"
  | "ARCHIVED"
  | "live"
  | "paused"
  | "draft"
  | "error";
export type ChannelType = "email" | "whatsapp" | "slack";

/**
 * Get color classes for automation status badges
 */
export function getStatusColor(status: AutomationStatus): string {
  // Normalize status to lowercase for backward compatibility checking if needed, but prefer exact match
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",

    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    PAUSED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",

    ARCHIVED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",

    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return colors[status] || colors.draft || "bg-gray-100 text-gray-700";
}

/**
 * Get status label
 */
export function getStatusLabel(status: AutomationStatus): string {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    live: "Active",
    PENDING: "Pending",
    PAUSED: "Paused",
    paused: "Paused",
    ARCHIVED: "Archived",
    draft: "Draft",
    error: "Error",
  };
  return labels[status] || status;
}

/**
 * Format relative time (e.g., "3h ago", "In 2 days")
 */
export function formatRelativeTime(date: Date | string, addSuffix = true): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix });
}

/**
 * Format time for "next run" display
 */
export function formatNextRun(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();

  if (diff < 0) return "Overdue";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) return `In ${days} days`;
  if (hours > 1) return `In ${hours} hours`;
  return "Soon";
}

/**
 * Get icon component for channel type
 */
export function getChannelIcon(channel: ChannelType) {
  const icons = {
    email: Mail,
    whatsapp: MessageSquare,
    slack: MessageSquare,
  };
  return icons[channel] || Mail;
}

/**
 * Get channel label
 */
export function getChannelLabel(channel: ChannelType): string {
  const labels = {
    email: "Email",
    whatsapp: "WhatsApp",
    slack: "Slack",
  };
  return labels[channel] || "Unknown";
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = "INR"): string {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Get integration icon
 */
export function getIntegrationIcon(integration: "notion" | "slack" | "whatsapp") {
  const icons = {
    notion: Database,
    slack: MessageSquare,
    whatsapp: MessageSquare,
  };
  return icons[integration] || Database;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
