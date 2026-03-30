"use client";

import { Filter, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReminders } from "../hooks/useReminders";

export function Filters() {
  const { queue, failures, filters, setFilters, resetFilters } = useReminders();
  const status = filters.statuses;
  const clients = filters.clients;
  const channels = filters.channels;

  const statusOptions = ["pending", "processing", "sent", "failed", "skipped"];
  const clientOptions = Array.from(
    new Set(
      [...queue.map((q: any) => q.client), ...failures.map((f: any) => f.client)]
        .filter(Boolean)
        .map((name) => String(name))
    )
  );
  const channelOptions = Array.from(
    new Set(queue.map((q: any) => String(q.channel || "").toLowerCase()).filter(Boolean))
  );

  const toggleFilter = (list: string[], key: "statuses" | "clients" | "channels", item: string) => {
    const normalized = item.toLowerCase();
    if (list.includes(item)) {
      setFilters({ [key]: list.filter((i) => i !== item) });
    } else {
      setFilters({ [key]: [...list, normalized] });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span>Status</span>
            {status.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {status.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={status.includes(s)}
              onCheckedChange={() => toggleFilter(status, "statuses", s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Client Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <span>Client</span>
            {clients.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {clients.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by Client</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {clientOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No clients available</div>
          ) : (
            clientOptions.map((c) => (
              <DropdownMenuCheckboxItem
                key={c}
                checked={clients.includes(c.toLowerCase())}
                onCheckedChange={() => toggleFilter(clients, "clients", c.toLowerCase())}
              >
                {c}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Channel Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <span>Channel</span>
            {channels.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {channels.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Channel</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {channelOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No channels available</div>
          ) : (
            channelOptions.map((c) => (
              <DropdownMenuCheckboxItem
                key={c}
                checked={channels.includes(c)}
                onCheckedChange={() => toggleFilter(channels, "channels", c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-6 w-px bg-border mx-1" />

      {(status.length > 0 || clients.length > 0 || channels.length > 0) && (
        <button
          onClick={() => resetFilters()}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 animate-in fade-in"
        >
          Reset
        </button>
      )}
    </div>
  );
}
