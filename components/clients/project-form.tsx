"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type ProjectFormProps = {
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
};

export function ProjectForm({ clientId, clientName, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "paused" | "completed" | "archived",
    rateType: "fixed" as "fixed" | "hourly" | "milestone",
    rateValue: "",
    defaultTax: "",
    defaultCurrency: "INR",
    startDate: "",
    endDate: "",
    tags: "",
    notes: "",
    billingMode: "single" as "single" | "milestone",
    paymentSchedule: "",
  });

  const handleSave = async () => {
    if (!data.name.trim()) return;
    setSaving(true);
    try {
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...data,
              clientId,
              rateValue: data.rateValue ? parseFloat(data.rateValue) : 0,
              defaultTax: data.defaultTax ? parseFloat(data.defaultTax) : 0,
              startDate: data.startDate || undefined,
              endDate: data.endDate || undefined,
              paymentSchedule: data.paymentSchedule,
            }),
          });
      if (res.ok) {
        // Reset form
        setData({
          name: "",
          description: "",
          status: "active",
          rateType: "fixed",
          rateValue: "",
          defaultTax: "",
          defaultCurrency: "INR",
          startDate: "",
          endDate: "",
          tags: "",
          notes: "",
          billingMode: "single",
          paymentSchedule: "",
        });
        // Call success callback (which will refresh the client data)
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <p>
          <strong>Client:</strong> {clientName}
        </p>
        <p className="text-xs mt-1">This project will be linked to {clientName}.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Project Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Website Redesign, Mobile App Development"
            value={data.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setData({ ...data, name: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the project..."
            value={data.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setData({ ...data, description: e.target.value })
            }
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={data.status}
              onValueChange={(v: "active" | "paused" | "completed" | "archived") =>
                setData({ ...data, status: v })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingMode">Billing Mode</Label>
            <Select
              value={data.billingMode}
              onValueChange={(v: "single" | "milestone") =>
                setData({ ...data, billingMode: v })
              }
            >
              <SelectTrigger id="billingMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single payment</SelectItem>
                <SelectItem value="milestone">Milestone-based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateType">Rate Type</Label>
            <Select
              value={data.rateType}
              onValueChange={(v: "fixed" | "hourly" | "milestone") =>
                setData({ ...data, rateType: v })
              }
            >
              <SelectTrigger id="rateType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="hourly">Hourly Rate</SelectItem>
                <SelectItem value="milestone">Milestone Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {data.billingMode === "milestone" && (
          <div className="space-y-2">
            <Label htmlFor="paymentSchedule">Payment Schedule (steps)</Label>
            <Textarea
              id="paymentSchedule"
              placeholder={`Milestone 1 - 40% on design\nMilestone 2 - 40% on dev\nMilestone 3 - 20% on launch`}
              value={data.paymentSchedule}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setData({ ...data, paymentSchedule: e.target.value })
              }
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              We will store this schedule with the project so invoices can be triggered per milestone.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rateValue">
              {data.rateType === "hourly" ? "Hourly Rate" : data.rateType === "milestone" ? "Milestone Value" : "Fixed Amount"}
            </Label>
            <Input
              id="rateValue"
              type="number"
              placeholder="0"
              value={data.rateValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setData({ ...data, rateValue: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultTax">Default Tax (%)</Label>
            <Input
              id="defaultTax"
              type="number"
              placeholder="18"
              value={data.defaultTax}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setData({ ...data, defaultTax: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Currency</Label>
            <Select
              value={data.defaultCurrency}
              onValueChange={(v: string) => setData({ ...data, defaultCurrency: v })}
            >
              <SelectTrigger id="defaultCurrency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setData({ ...data, startDate: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setData({ ...data, endDate: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="e.g., Design, Development, Urgent (comma separated)"
            value={data.tags}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setData({ ...data, tags: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple tags with commas
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Internal notes about this project..."
            value={data.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setData({ ...data, notes: e.target.value })
            }
            className="min-h-[80px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (onSuccess) onSuccess();
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!data.name.trim() || saving}>
          {saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
