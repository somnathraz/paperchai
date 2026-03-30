"use client";

import { memo, useState } from "react";
import { Plus, Filter, MoreVertical, Play, Pause, Copy, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStatusColor,
  getStatusLabel,
  getChannelIcon,
  formatRelativeTime,
  formatNextRun,
  type AutomationStatus,
  type ChannelType,
} from "../lib/automation-utils";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  triggerLabel?: string;
  scope: string;
  scopeLabel?: string;
  channels: ChannelType[];
  lastRun?: Date | string;
  nextRun?: Date | string;
  status: AutomationStatus;
}

interface ActiveAutomationsSectionProps {
  automations?: AutomationRule[];
  canManage?: boolean;
  onCreateNew?: () => void;
  onEdit?: (id: string) => void;
  onPause?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

type FilterType = "all" | "reminders" | "slack" | "notion" | "whatsapp";

const FilterChip = memo(function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation ${
        active
          ? "bg-violet-600 text-white"
          : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/70"
      }`}
    >
      {label}
    </button>
  );
});

const ChannelIcons = memo(function ChannelIcons({ channels }: { channels: ChannelType[] }) {
  return (
    <div className="flex items-center gap-1">
      {channels.map((channel) => {
        const Icon = getChannelIcon(channel);
        return (
          <div key={channel} className="p-1 rounded bg-muted" title={channel}>
            <Icon className="w-3 h-3 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
});

const AutomationCard = memo(function AutomationCard({
  automation,
  onEdit,
  onPause,
  onDuplicate,
  onDelete,
  onViewDetails,
}: {
  automation: AutomationRule;
} & Pick<
  ActiveAutomationsSectionProps,
  "onEdit" | "onPause" | "onDuplicate" | "onDelete" | "onViewDetails"
>) {
  const toggleLabel =
    automation.status === "ACTIVE"
      ? "Pause"
      : automation.status === "PAUSED"
        ? "Resume"
        : automation.status === "PENDING"
          ? "Approve"
          : "Resume";

  return (
    <Card
      className="p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer"
      onClick={() => onViewDetails?.(automation.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1 truncate">{automation.name}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {automation.triggerLabel ?? automation.trigger}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Badge
            variant="outline"
            className={`${getStatusColor(automation.status)} border-0 text-xs`}
          >
            {getStatusLabel(automation.status)}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(automation.id);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPause?.(automation.id);
                }}
              >
                {toggleLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.(automation.id);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(automation.id);
                }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="truncate">Scope: {automation.scopeLabel ?? automation.scope}</span>
        <span>•</span>
        <ChannelIcons channels={automation.channels} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div suppressHydrationWarning>
          <span className="text-muted-foreground">Last run: </span>
          <span>{automation.lastRun ? formatRelativeTime(automation.lastRun) : "Never"}</span>
        </div>
        <div suppressHydrationWarning>
          <span className="text-muted-foreground">Next: </span>
          <span className="font-medium">
            {automation.nextRun ? formatNextRun(automation.nextRun) : "—"}
          </span>
        </div>
      </div>
    </Card>
  );
});

const EmptyState = memo(function EmptyState({
  canManage,
  onCreateNew,
}: {
  canManage?: boolean;
  onCreateNew?: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Play className="w-8 h-8 text-muted-foreground opacity-30" />
      </div>
      <h3 className="font-medium mb-2">No automations yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first automation to start chasing invoices automatically.
      </p>
      <Button
        onClick={onCreateNew}
        disabled={!canManage}
        title={!canManage ? "Only workspace owners/admins can create automations" : undefined}
        className="bg-violet-600 hover:bg-violet-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create your first automation
      </Button>
    </div>
  );
});

export const ActiveAutomationsSection = memo(function ActiveAutomationsSection({
  automations = [],
  canManage = true,
  onCreateNew,
  onEdit,
  onPause,
  onDuplicate,
  onDelete,
  onViewDetails,
}: ActiveAutomationsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredAutomations = automations.filter((automation) => {
    if (activeFilter === "all") return true;
    // Add filtering logic based on automation type
    return true;
  });

  const getToggleLabel = (status: AutomationStatus) =>
    status === "ACTIVE"
      ? "Pause"
      : status === "PAUSED"
        ? "Resume"
        : status === "PENDING"
          ? "Approve"
          : "Resume";

  return (
    <div className="space-y-4 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Active Automations</h2>
          <p className="text-sm text-muted-foreground">
            Every rule currently chasing money for you.
          </p>
        </div>
        <Button
          onClick={onCreateNew}
          disabled={!canManage}
          title={!canManage ? "Only workspace owners/admins can create automations" : undefined}
          className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <FilterChip
          label="All"
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
        />
        <FilterChip
          label="Reminders"
          active={activeFilter === "reminders"}
          onClick={() => setActiveFilter("reminders")}
        />
        <FilterChip
          label="Slack"
          active={activeFilter === "slack"}
          onClick={() => setActiveFilter("slack")}
        />
        <FilterChip
          label="Notion"
          active={activeFilter === "notion"}
          onClick={() => setActiveFilter("notion")}
        />
        <FilterChip
          label="WhatsApp"
          active={activeFilter === "whatsapp"}
          onClick={() => setActiveFilter("whatsapp")}
        />
      </div>

      {/* Content */}
      {filteredAutomations.length === 0 ? (
        <Card className="p-6">
          <EmptyState canManage={canManage} onCreateNew={onCreateNew} />
        </Card>
      ) : (
        <>
          {/* Desktop: Table view */}
          <Card className="hidden lg:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAutomations.map((automation) => (
                  <TableRow
                    key={automation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetails?.(automation.id)}
                  >
                    <TableCell className="font-medium">{automation.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {automation.triggerLabel ?? automation.trigger}
                    </TableCell>
                    <TableCell className="text-sm">
                      {automation.scopeLabel ?? automation.scope}
                    </TableCell>
                    <TableCell>
                      <ChannelIcons channels={automation.channels} />
                    </TableCell>
                    <TableCell className="text-sm" suppressHydrationWarning>
                      {automation.lastRun ? formatRelativeTime(automation.lastRun) : "Never"}
                    </TableCell>
                    <TableCell className="text-sm font-medium" suppressHydrationWarning>
                      {automation.nextRun ? formatNextRun(automation.nextRun) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(automation.status)} border-0`}
                      >
                        {getStatusLabel(automation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.(automation.id);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onPause?.(automation.id);
                            }}
                          >
                            {getToggleLabel(automation.status)}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate?.(automation.id);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(automation.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: Card stack */}
          <div className="lg:hidden space-y-3">
            {filteredAutomations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onEdit={onEdit}
                onPause={onPause}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
