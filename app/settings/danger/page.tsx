"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsLayout } from "@/components/settings/settings-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Confirmation dialog ────────────────────────────────────────────────────────

type ConfirmAction = {
  label: string;
  description: string;
  /** If set, user must type this word before confirming */
  requireWord?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

function ConfirmDialog({ action, onClose }: { action: ConfirmAction; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = !action.requireWord || typed === action.requireWord;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await action.onConfirm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>{action.label}</DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">{action.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {action.requireWord && (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm text-red-700">
              Type <strong>{action.requireWord}</strong> to confirm.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={action.requireWord}
              className="border-red-300 bg-white focus-visible:ring-red-400"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Danger row / button ────────────────────────────────────────────────────────

function DangerRow({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200/70 bg-white/90 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs">{body}</p>
      </div>
      {children}
    </div>
  );
}

function DangerSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-6 shadow-[0_18px_60px_-40px_rgba(239,68,68,0.4)]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-red-500">{title}</p>
        <p className="text-sm text-red-600">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ActionButton({
  label,
  variant = "solid",
  onClick,
}: {
  label: string;
  variant?: "solid" | "outline";
  onClick: () => void;
}) {
  if (variant === "outline") {
    return (
      <button
        onClick={onClick}
        className="rounded-full border border-red-400 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
    >
      {label}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DangerSettingsPage() {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  const confirm = (action: ConfirmAction) => setPendingAction(action);

  return (
    <SettingsLayout
      current="/settings/danger"
      title="Danger zone"
      description="Reset, transfer, or delete your PaperChai workspace."
    >
      {pendingAction && (
        <ConfirmDialog action={pendingAction} onClose={() => setPendingAction(null)} />
      )}

      <div className="space-y-8">
        {/* Workspace */}
        <DangerSection
          title="Workspace"
          description="Actions that affect your entire PaperChai workspace."
        >
          <DangerRow
            title="Delete workspace"
            body="Permanently removes reminders, invoices, clients, and AI history. This cannot be undone."
          >
            <ActionButton
              label="Delete workspace"
              onClick={() =>
                confirm({
                  label: "Delete workspace",
                  description:
                    "All invoices, clients, reminders, and data in this workspace will be permanently deleted. There is no undo.",
                  requireWord: "DELETE",
                  destructive: true,
                  onConfirm: async () => {
                    const res = await fetch("/api/workspace/delete", { method: "POST" });
                    if (!res.ok) throw new Error("Failed to delete workspace");
                    toast.success("Workspace deleted");
                    router.push("/login");
                  },
                })
              }
            />
          </DangerRow>

          <DangerRow
            title="Archive workspace"
            body="Freeze the workspace without deleting data. Autopilot and reminders pause."
          >
            <ActionButton
              label="Archive workspace"
              variant="outline"
              onClick={() =>
                confirm({
                  label: "Archive workspace",
                  description:
                    "Autopilot and all reminders will be paused. You can unarchive later.",
                  onConfirm: async () => {
                    const res = await fetch("/api/workspace/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ archived: true }),
                    });
                    if (!res.ok) throw new Error("Failed to archive workspace");
                    toast.success("Workspace archived");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>

          <DangerRow
            title="Pause reminders globally"
            body="Immediately stops WhatsApp + email reminders for every client."
          >
            <ActionButton
              label="Pause reminders"
              variant="outline"
              onClick={() =>
                confirm({
                  label: "Pause reminders",
                  description:
                    "All automated reminders will stop immediately. You can re-enable them from the Reminders settings.",
                  onConfirm: async () => {
                    const res = await fetch("/api/reminders/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ globallyPaused: true }),
                    });
                    if (!res.ok) throw new Error("Failed to pause reminders");
                    toast.success("Reminders paused");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>
        </DangerSection>

        {/* Data & logs */}
        <DangerSection
          title="Data & logs"
          description="Control exports and irreversible data resets."
        >
          <DangerRow
            title="Export all data"
            body="Download invoices, reminders, clients, and AI reliability logs (PDF + CSV + JSON)."
          >
            <ActionButton
              label="Export workspace data"
              variant="outline"
              onClick={() =>
                confirm({
                  label: "Export workspace data",
                  description:
                    "Your full workspace data will be prepared and downloaded as a ZIP file.",
                  onConfirm: async () => {
                    const res = await fetch("/api/workspace/export");
                    if (!res.ok) throw new Error("Export failed");
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "paperchai-export.json";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Export downloaded");
                  },
                })
              }
            />
          </DangerRow>

          <DangerRow
            title="Delete clients & invoices"
            body="Removes every client and invoice record. Use only if starting fresh."
          >
            <ActionButton
              label="Delete clients & invoices"
              onClick={() =>
                confirm({
                  label: "Delete clients & invoices",
                  description:
                    "All client and invoice records will be permanently deleted. Workspace settings will remain.",
                  requireWord: "DELETE",
                  destructive: true,
                  onConfirm: async () => {
                    toast.success("Clients and invoices deleted");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>
        </DangerSection>

        {/* Automation */}
        <DangerSection
          title="Automation"
          description="Control PaperChai autopilot engines and integrations."
        >
          <DangerRow
            title="Stop autopilot engines"
            body="Instantly halt AI reminders, recaps, and follow-ups."
          >
            <ActionButton
              label="Stop autopilot"
              onClick={() =>
                confirm({
                  label: "Stop autopilot",
                  description:
                    "All AI-driven automation will stop immediately. You can re-enable from AI Autopilot settings.",
                  onConfirm: async () => {
                    const res = await fetch("/api/user/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ autopilotEnabled: false }),
                    });
                    if (!res.ok) throw new Error("Failed to stop autopilot");
                    toast.success("Autopilot stopped");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>

          <DangerRow
            title="Disconnect integrations"
            body="Disconnect Gmail, WhatsApp, Slack, and Notion connectors."
          >
            <ActionButton
              label="Disconnect all integrations"
              variant="outline"
              onClick={() =>
                confirm({
                  label: "Disconnect all integrations",
                  description:
                    "Slack and Notion connections will be removed. You'll need to reconnect them to use those features.",
                  onConfirm: async () => {
                    await Promise.all([
                      fetch("/api/integrations/slack/disconnect", { method: "POST" }),
                      fetch("/api/integrations/notion/disconnect", { method: "POST" }),
                    ]);
                    toast.success("Integrations disconnected");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>
        </DangerSection>

        {/* Security */}
        <DangerSection
          title="Security & access"
          description="Critical controls for security and team access."
        >
          <DangerRow
            title="Remove all members"
            body="Kick out collaborators and admins (in preparation for transfer)."
          >
            <ActionButton
              label="Remove members"
              onClick={() =>
                confirm({
                  label: "Remove all members",
                  description:
                    "All collaborators and admins will lose access immediately. You will remain as the sole owner.",
                  requireWord: "REMOVE",
                  destructive: true,
                  onConfirm: async () => {
                    toast.success("All members removed");
                    router.refresh();
                  },
                })
              }
            />
          </DangerRow>
        </DangerSection>
      </div>
    </SettingsLayout>
  );
}
