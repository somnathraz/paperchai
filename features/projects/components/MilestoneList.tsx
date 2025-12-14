
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useProjects } from "../hooks/useProjects";

type Milestone = {
    id: string;
    title: string;
    description?: string | null;
    amount: number;
    currency: string;
    status: string;
    expectedDate?: string | Date | null;
    dueDate?: string | Date | null;
    invoiceId?: string | null;
    billingTrigger: string;
};

interface MilestoneListProps {
    milestones: Milestone[];
    projectId: string;
    currency: string;
    readOnly?: boolean;
}

export function MilestoneList({ milestones, projectId, currency, readOnly }: MilestoneListProps) {
    const router = useRouter();
    const { addMilestone, editMilestone } = useProjects();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newMilestone, setNewMilestone] = useState({
        title: "",
        description: "",
        amount: "",
        expectedDate: "",
        billingTrigger: "ON_COMPLETION"
    });

    const handleStatusChange = async (id: string, newStatus: string) => {
        setUpdatingId(id);
        try {
            await editMilestone(id, { status: newStatus }).unwrap();
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAddMilestone = async () => {
        if (!newMilestone.title.trim() || !newMilestone.amount) {
            toast.error("Title and amount are required");
            return;
        }

        setIsAdding(true);
        try {
            await addMilestone(projectId, {
                title: newMilestone.title,
                description: newMilestone.description || null,
                amount: parseFloat(newMilestone.amount),
                expectedDate: newMilestone.expectedDate || null,
                billingTrigger: newMilestone.billingTrigger,
                currency: currency
            }).unwrap();

            toast.success("Milestone added successfully!");
            setShowAddModal(false);
            setNewMilestone({
                title: "",
                description: "",
                amount: "",
                expectedDate: "",
                billingTrigger: "ON_COMPLETION"
            });
        } catch (error) {
            toast.error("Failed to add milestone");
        } finally {
            setIsAdding(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PLANNED": return "bg-gray-100 text-gray-700";
            case "IN_PROGRESS": return "bg-blue-100 text-blue-700";
            case "READY_FOR_INVOICE": return "bg-purple-100 text-purple-700";
            case "INVOICED": return "bg-amber-100 text-amber-700";
            case "PAID": return "bg-green-100 text-green-700";
            case "CANCELLED": return "bg-red-50 text-red-500";
            default: return "bg-gray-100";
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-semibold text-lg">Milestones</h3>
                    <Button size="sm" variant="outline" disabled={readOnly} onClick={() => setShowAddModal(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Add Milestone
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Expected Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {milestones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    No milestones defined yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            milestones.map((m, idx) => (
                                <TableRow key={m.id}>
                                    <TableCell className="text-slate-500 font-medium">{idx + 1}</TableCell>
                                    <TableCell>
                                        <p className="font-medium text-slate-900">{m.title}</p>
                                        {m.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{m.description}</p>}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono">{m.currency} {m.amount.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {m.expectedDate ? new Date(m.expectedDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {readOnly ? (
                                            <Badge className={`bg-transparent border ${getStatusColor(m.status)} font-normal`}>{m.status}</Badge>
                                        ) : (
                                            <Select
                                                value={m.status}
                                                onValueChange={(val) => handleStatusChange(m.id, val)}
                                                disabled={!!updatingId}
                                            >
                                                <SelectTrigger className={`h-8 w-[140px] ${getStatusColor(m.status)} border-0 focus:ring-1`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PLANNED">Planned</SelectItem>
                                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                                    <SelectItem value="READY_FOR_INVOICE">Ready for Inv.</SelectItem>
                                                    <SelectItem value="INVOICED">Invoiced</SelectItem>
                                                    <SelectItem value="PAID">Paid</SelectItem>
                                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {m.invoiceId ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-emerald-600"
                                                onClick={() => router.push(`/invoices/new?id=${m.invoiceId}`)}
                                            >
                                                <FileText className="h-3 w-3 mr-1" /> View Inv
                                            </Button>
                                        ) : m.status === 'READY_FOR_INVOICE' && !readOnly ? (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8"
                                                onClick={() => handleStatusChange(m.id, "READY_FOR_INVOICE")}
                                                disabled={!!updatingId}
                                            >
                                                {updatingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
                                            </Button>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Milestone Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Milestone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Initial Deposit"
                                value={newMilestone.title}
                                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Optional description"
                                value={newMilestone.description}
                                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount ({currency}) *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={newMilestone.amount}
                                    onChange={(e) => setNewMilestone({ ...newMilestone, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expectedDate">Expected Date</Label>
                                <Input
                                    id="expectedDate"
                                    type="date"
                                    value={newMilestone.expectedDate}
                                    onChange={(e) => setNewMilestone({ ...newMilestone, expectedDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="billingTrigger">Billing Trigger</Label>
                            <Select
                                value={newMilestone.billingTrigger}
                                onValueChange={(val) => setNewMilestone({ ...newMilestone, billingTrigger: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ON_CREATION">On Creation</SelectItem>
                                    <SelectItem value="ON_COMPLETION">On Completion</SelectItem>
                                    <SelectItem value="MANUAL">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleAddMilestone} disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add Milestone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
