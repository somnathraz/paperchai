"use client";

import Link from "next/link";
import { memo } from "react";
import { X, Calendar, Users, MessageSquare, Mail, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  getStatusColor,
  getStatusLabel,
  getChannelIcon,
  formatRelativeTime,
  type AutomationStatus,
  type ChannelType,
} from "../lib/automation-utils";

interface AutomationStep {
  timing: string; // e.g., "T-3d", "T day", "T+3d"
  channel: ChannelType;
  template: string;
}

interface GeneratedInvoice {
  id: string;
  number: string;
  clientName: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string | Date;
  approvalStatus?: string;
}

interface RecentRun {
  id: string;
  timestamp: Date;
  client: string;
  action: string;
  status: "success" | "failed" | "pending";
}

interface AutomationDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  automation?: {
    id: string;
    name: string;
    status: AutomationStatus;
    trigger: string;
    scope: string;
    channels: ChannelType[];
    createdBy?: string;
    createdAt?: Date | string;
    steps?: AutomationStep[];
    linkedTemplates?: Array<{ slug: string; name: string }>;
    recentRuns?: RecentRun[];
  };
  onToggleStatus?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEditTemplate?: (slug: string) => void;
  generatedInvoices?: GeneratedInvoice[];
  invoicesLoading?: boolean;
  stepsNote?: string;
  templatesNote?: string;
}

const TimelineStep = memo(function TimelineStep({ step }: { step: AutomationStep }) {
  const Icon = getChannelIcon(step.channel);

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="w-0.5 h-8 bg-border" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{step.timing}</span>
          <Badge variant="outline" className="text-xs">
            {step.channel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{step.template}</p>
      </div>
    </div>
  );
});

const RunItem = memo(function RunItem({ run }: { run: RecentRun }) {
  const statusColors = {
    success: "text-green-600",
    failed: "text-red-600",
    pending: "text-yellow-600",
  };

  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <p className="text-sm font-medium">{run.client}</p>
        <p className="text-xs text-muted-foreground">{run.action}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{formatRelativeTime(run.timestamp)}</p>
        <p className={`text-xs font-medium ${statusColors[run.status]}`}>{run.status}</p>
      </div>
    </div>
  );
});

export const AutomationDetailsDrawer = memo(function AutomationDetailsDrawer({
  open,
  onClose,
  automation,
  onToggleStatus,
  onEdit,
  onDelete,
  onDuplicate,
  onEditTemplate,
  generatedInvoices,
  invoicesLoading,
  stepsNote,
  templatesNote,
}: AutomationDetailsDrawerProps) {
  if (!automation) return null;

  const isEnabled = automation.status === "ACTIVE";
  const steps = automation.steps ?? [];
  const linkedTemplates = automation.linkedTemplates ?? [];
  const recentRuns = automation.recentRuns ?? [];
  const invoices = generatedInvoices ?? [];
  const createdBy = automation.createdBy || "You";
  const createdAt = automation.createdAt ? formatRelativeTime(automation.createdAt) : "Unknown";
  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{automation.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`${getStatusColor(automation.status)} border-0`}
                >
                  {getStatusLabel(automation.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => onToggleStatus?.(automation.id, checked)}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Overview */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Trigger: </span>
                  <span>{automation.trigger}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Scope: </span>
                  <span>{automation.scope}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Channels: </span>
                  <span>{automation.channels.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Created: </span>
                  <span>
                    {createdAt} by {createdBy}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Steps Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Steps</h3>
            {steps.length > 0 ? (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <TimelineStep key={index} step={step} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {stepsNote || "No steps configured yet."}
              </p>
            )}
          </div>

          <Separator />

          {/* Linked Templates */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Linked Templates</h3>
            {linkedTemplates.length > 0 ? (
              <div className="space-y-2">
                {linkedTemplates.map((template) => (
                  <div
                    key={template.slug}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{template.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onEditTemplate?.(template.slug)}
                    >
                      Edit template
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {templatesNote || "No templates linked yet."}
              </p>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Generated invoices</h3>
            {invoicesLoading ? (
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            ) : invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/new?id=${invoice.id}`}
                    className="flex items-start justify-between rounded-lg border border-border/60 p-3 transition hover:border-violet-300"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">#{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Created {formatRelativeTime(invoice.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatAmount(Number(invoice.amount || 0), invoice.currency || "INR")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {invoice.status}
                        </Badge>
                        {invoice.approvalStatus === "PENDING" ? (
                          <Badge variant="outline" className="text-[10px] text-amber-700">
                            Approval pending
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices created yet.</p>
            )}
          </div>

          <Separator />

          {/* Recent Runs */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent Runs</h3>
            <div className="divide-y divide-border">
              {recentRuns.length > 0 ? (
                recentRuns.map((run) => <RunItem key={run.id} run={run} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No runs yet</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2 pb-6">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onEdit?.(automation.id)}
            >
              Edit Steps
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onDuplicate?.(automation.id)}
            >
              Duplicate Automation
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => onDelete?.(automation.id)}
            >
              Delete Automation
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
