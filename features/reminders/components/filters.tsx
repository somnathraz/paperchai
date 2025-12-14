"use client";

import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Filters() {
    // Mock state for filters - in a real app these would lift up or use URL search params
    const [status, setStatus] = useState<string[]>([]);
    const [clients, setClients] = useState<string[]>([]);
    const [channels, setChannels] = useState<string[]>([]);

    const toggleFilter = (list: string[], setList: (s: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
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
                    {["Pending", "Scheduled", "Sent", "Failed", "Paid"].map((s) => (
                        <DropdownMenuCheckboxItem
                            key={s}
                            checked={status.includes(s)}
                            onCheckedChange={() => toggleFilter(status, setStatus, s)}
                        >
                            {s}
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
                    {["Acme Corp", "Globex Inc", "Soylent Corp", "Initech", "Umbrella Corp"].map((c) => (
                        <DropdownMenuCheckboxItem
                            key={c}
                            checked={clients.includes(c)}
                            onCheckedChange={() => toggleFilter(clients, setClients, c)}
                        >
                            {c}
                        </DropdownMenuCheckboxItem>
                    ))}
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
                    {["Email", "WhatsApp", "SMS"].map((c) => (
                        <DropdownMenuCheckboxItem
                            key={c}
                            checked={channels.includes(c)}
                            onCheckedChange={() => toggleFilter(channels, setChannels, c)}
                        >
                            {c}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-px bg-border mx-1" />

            {(status.length > 0 || clients.length > 0 || channels.length > 0) && (
                <button
                    onClick={() => {
                        setStatus([]);
                        setClients([]);
                        setChannels([]);
                    }}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 animate-in fade-in"
                >
                    Reset
                </button>
            )}
        </div>
    );
}
