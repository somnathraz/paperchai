"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NewProjectDialog({
    open,
    onOpenChange,
    clientId,
    clientName
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    clientName: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("FIXED");
    const [totalBudget, setTotalBudget] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/clients/${clientId}/projects`, {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description,
                    type,
                    totalBudget: totalBudget ? parseFloat(totalBudget) * 100 : 0, // Convert to cents
                    currency: "INR", // Default
                    billingStrategy: "SINGLE_INVOICE" // Default
                }),
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) throw new Error("Failed to create project");

            const data = await res.json();

            toast.success("Project created successfully");
            onOpenChange(false);
            router.push(`/projects/${data.project.id}`);
        } catch (error) {
            toast.error("Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Project for {clientName}</DialogTitle>
                    <DialogDescription>
                        Create a new project. You can add milestones later.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Website Redesign"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Project Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FIXED">Fixed Price</SelectItem>
                                    <SelectItem value="HOURLY">Hourly</SelectItem>
                                    <SelectItem value="RETAINER">Retainer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="budget">Budget (INR)</Label>
                            <Input
                                id="budget"
                                type="number"
                                value={totalBudget}
                                onChange={(e) => setTotalBudget(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
