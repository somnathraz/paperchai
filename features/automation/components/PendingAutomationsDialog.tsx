"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PendingAutomation {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  status: string;
}

interface PendingAutomationsDialogProps {
  open: boolean;
  onClose: () => void;
  onApproved?: () => void;
}

export function PendingAutomationsDialog({
  open,
  onClose,
  onApproved,
}: PendingAutomationsDialogProps) {
  const [pendingAutomations, setPendingAutomations] = useState<PendingAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPendingAutomations();
    }
  }, [open]);

  const fetchPendingAutomations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/automation/rules");
      if (response.ok) {
        const data = await response.json();
        const pending = data.automations?.filter((a: any) => a.status === "PENDING") || [];
        setPendingAutomations(pending);
      }
    } catch (error) {
      console.error("Failed to fetch pending automations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (automationId: string) => {
    setApproving(automationId);
    try {
      const response = await fetch(`/api/automation/rules/${automationId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        // Remove from pending list
        setPendingAutomations((prev) => prev.filter((a) => a.id !== automationId));

        // If no more pending, close and notify parent
        if (pendingAutomations.length === 1) {
          onApproved?.();
          onClose();
        }
      }
    } catch (error) {
      console.error("Failed to approve automation:", error);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (automationId: string) => {
    try {
      await fetch(`/api/automation/rules/${automationId}`, {
        method: "DELETE",
      });
      setPendingAutomations((prev) => prev.filter((a) => a.id !== automationId));

      if (pendingAutomations.length === 1) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to reject automation:", error);
    }
  };

  if (isLoading || pendingAutomations.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Approve Suggested Automations
          </DialogTitle>
          <DialogDescription>
            We&apos;ve created {pendingAutomations.length} automation suggestion
            {pendingAutomations.length > 1 ? "s" : ""} based on your Notion import. Review and
            approve to activate them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {pendingAutomations.map((automation) => (
            <Card key={automation.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{automation.name}</h3>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  {automation.description && (
                    <p className="text-sm text-muted-foreground">{automation.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleApprove(automation.id)}
                  disabled={approving === automation.id}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {approving === automation.id ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(automation.id)}
                  disabled={approving !== null}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Review Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
