"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search, RefreshCw, Filter } from "lucide-react";

interface AuditLog {
    id: string;
    userId: string;
    workspaceId: string | null;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    metadata: any;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    createdAt: string;
}

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [actionFilter, setActionFilter] = useState("");
    const [userIdFilter, setUserIdFilter] = useState("");
    const [availableActions, setAvailableActions] = useState<string[]>([]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "50",
            });
            if (actionFilter) params.append("action", actionFilter);
            if (userIdFilter) params.append("userId", userIdFilter);

            const response = await fetch(`/api/system-logs?${params}`);
            const data = await response.json();

            setLogs(data.logs || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 0);
            setAvailableActions(data.filters?.actions || []);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, userIdFilter]);

    const getActionBadgeColor = (action: string) => {
        if (action.includes("LOGIN") || action.includes("SIGNUP")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
        if (action.includes("FAILED") || action.includes("ERROR")) return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
        if (action.includes("DELETED") || action.includes("REMOVED")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
        if (action.includes("CREATED") || action.includes("INVITED")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
        if (action.includes("SENT") || action.includes("EXECUTED")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Logs</h1>
                <p className="text-muted-foreground">
                    Real-time audit trail of all security-sensitive actions across the platform.
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <CardTitle className="text-base">Filters</CardTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setActionFilter("");
                                setUserIdFilter("");
                                setPage(1);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Action Type</label>
                            <Select value={actionFilter || undefined} onValueChange={(value) => setActionFilter(value || "")}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableActions.map((action) => (
                                        <SelectItem key={action} value={action}>
                                            {action}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">User ID</label>
                            <Input
                                placeholder="Filter by user ID..."
                                value={userIdFilter}
                                onChange={(e) => setUserIdFilter(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchLogs} className="w-full">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total Logs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{availableActions.length}</div>
                        <p className="text-xs text-muted-foreground">Unique Actions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">Page {page} of {totalPages}</div>
                        <p className="text-xs text-muted-foreground">Pagination</p>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>
                        Showing {logs.length} logs on page {page}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                            No logs found
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Timestamp</TableHead>
                                        <TableHead className="w-[200px]">Action</TableHead>
                                        <TableHead className="w-[150px]">User ID</TableHead>
                                        <TableHead className="w-[120px]">Resource</TableHead>
                                        <TableHead className="w-[140px]">IP Address</TableHead>
                                        <TableHead>Metadata</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getActionBadgeColor(log.action)}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.userId === "SYSTEM" ? (
                                                    <Badge variant="outline">SYSTEM</Badge>
                                                ) : (
                                                    <span className="truncate block max-w-[140px]" title={log.userId}>
                                                        {log.userId}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {log.resourceType && (
                                                    <div>
                                                        <div className="font-medium">{log.resourceType}</div>
                                                        {log.resourceId && (
                                                            <div className="text-muted-foreground truncate max-w-[100px]" title={log.resourceId}>
                                                                {log.resourceId}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.ipAddress || "-"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                    <details className="cursor-pointer">
                                                        <summary className="text-blue-600 hover:underline">
                                                            View ({Object.keys(log.metadata).length} fields)
                                                        </summary>
                                                        <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-x-auto max-w-[300px]">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    </details>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} logs
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
