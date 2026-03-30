
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// In a real implementation this would import a ProjectForm or similar
// For now, simple stub to satisfy build
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface NewProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId?: string;
    clientName?: string;
}

export function NewProjectDialog({ open, onOpenChange, clientId, clientName }: NewProjectDialogProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    clientId,
                    // Default values
                    status: "ACTIVE",
                    billingStrategy: "SINGLE_INVOICE"
                }),
            });

            if (res.ok) {
                const project = await res.json();
                onOpenChange(false);
                router.push(`/projects/${project.id}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to create project", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Project {clientName ? `for ${clientName}` : ""}</DialogTitle>
                    <DialogDescription>Create a new project to track work and billing.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input
                            id="project-name"
                            placeholder="e.g. Website Overhaul"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Project
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
