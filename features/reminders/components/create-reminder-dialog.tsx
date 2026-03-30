"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Default steps if not using invoice defaults
const DEFAULT_STEPS = [
  {
    index: 0,
    daysBeforeDue: 3,
    label: "Gentle Reminder",
    templateSlug: "reminder-gentle",
    notifyCreator: false,
  },
  {
    index: 1,
    daysAfterDue: 1,
    label: "Due Date Follow-up",
    templateSlug: "reminder-standard",
    notifyCreator: true,
  },
  {
    index: 2,
    daysAfterDue: 7,
    label: "Overdue Warning",
    templateSlug: "reminder-assertive",
    notifyCreator: true,
  },
];

export function CreateReminderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Data state
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<
    { id: string; number: string; clientId: string; total: string }[]
  >([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");

  useEffect(() => {
    if (open) {
      const load = async () => {
        setLoading(true);
        try {
          const [clientsRes, invoicesRes] = await Promise.all([
            fetch("/api/clients/list"),
            fetch("/api/invoices/list?status=draft,pending,overdue"),
          ]);

          if (clientsRes.ok) {
            const data = await clientsRes.json();
            setClients(data.clients || []);
          }
          if (invoicesRes.ok) {
            const data = await invoicesRes.json();
            setInvoices(data.invoices || []);
          }
        } catch (err) {
          console.error("Failed to load data", err);
          toast.error("Failed to load invoices");
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [open]);

  const handleEnable = async () => {
    if (!selectedInvoice) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          useDefaults: true,
          steps: DEFAULT_STEPS,
        }),
      });

      if (res.ok) {
        toast.success("Reminders enabled for invoice");
        setOpen(false);
        setSelectedInvoice("");
        router.refresh(); // Refresh the page to show new queue items
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to enable reminders");
      }
    } catch (err) {
      console.error("Failed to create reminder", err);
      toast.error("Failed to create reminder");
    } finally {
      setCreating(false);
    }
  };

  const filteredInvoices =
    selectedClient && selectedClient !== "all"
      ? invoices.filter((inv) => inv.clientId === selectedClient)
      : invoices;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all">
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
          <DialogDescription>
            Enable automation for an existing invoice. This will schedule emails based on your
            default cadence.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Filter by Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Invoice</Label>
              <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredInvoices.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No eligible invoices found
                    </div>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.number} - ₹{inv.total}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleEnable} disabled={!selectedInvoice || creating || loading}>
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Enable Automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
