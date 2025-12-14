"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Upload,
  FileText,
  MapPin,
  CreditCard,
  AlertTriangle,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Mail,
  MessageCircle,
  Slack,
  FileCode,
  Sparkles,
} from "lucide-react";
import { WorkspacePreview } from "./workspace-preview";
import { WorkspaceLogoUpload } from "./workspace-logo-upload";
import { ConnectedAccounts } from "./connected-accounts";

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceFormProps = {
  workspace: Workspace;
};

type WorkspaceData = {
  name: string;
  businessType: string;
  taxGstNumber: string;
  pan: string;
  registeredEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pin: string;
  country: string;
  logo: string | null;
};

export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<WorkspaceData>({
    name: workspace.name,
    businessType: "Freelancer",
    taxGstNumber: "",
    pan: "",
    registeredEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pin: "",
    country: "India",
    logo: null,
  });

  const [initialData, setInitialData] = useState<WorkspaceData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [logo, setLogo] = useState<string | null>(null);

  // Load workspace data from API
  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        const res = await fetch("/api/workspace/settings");
        if (res.ok) {
          const data = await res.json();
          const loadedData: WorkspaceData = {
            name: data.name || workspace.name,
            businessType: data.businessType || "Freelancer",
            taxGstNumber: data.taxGstNumber || "",
            pan: data.pan || "",
            registeredEmail: data.registeredEmail || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            city: data.city || "",
            state: data.state || "",
            pin: data.pin || "",
            country: data.country || "India",
            logo: data.logo || null,
          };
          setFormData(loadedData);
          setInitialData(loadedData);
          setLogo(data.logo || null);
        }
      } catch (error) {
        console.error("Failed to load workspace data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceData();
  }, [workspace.name]);

  useEffect(() => {
    // Check if form has changes compared to initial data
    if (initialData) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialData) || logo !== initialData.logo;
      setHasChanges(hasChanged);
      setSaved(!hasChanged);
    }
  }, [formData, logo, initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          logo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update initial data to reflect saved state
        const savedData: WorkspaceData = {
          name: data.workspace.name || formData.name,
          businessType: data.workspace.businessType || formData.businessType,
          taxGstNumber: data.workspace.taxGstNumber || "",
          pan: data.workspace.pan || "",
          registeredEmail: data.workspace.registeredEmail || "",
          addressLine1: data.workspace.addressLine1 || "",
          addressLine2: data.workspace.addressLine2 || "",
          city: data.workspace.city || "",
          state: data.workspace.state || "",
          pin: data.workspace.pin || "",
          country: data.workspace.country || "India",
          logo: data.workspace.logo || null,
        };
        setInitialData(savedData);
        setSaved(true);
        setHasChanges(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save workspace settings");
      }
    } catch (error) {
      console.error("Failed to save workspace settings:", error);
      alert("Failed to save workspace settings");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/workspace/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `workspace-${workspace.slug}-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to export workspace data");
      }
    } catch (error) {
      console.error("Failed to export workspace:", error);
      alert("Failed to export workspace data");
    }
  };

  const handleDelete = async () => {
    const confirmName = prompt(
      `Type "${formData.name}" to confirm deletion. This action cannot be undone.`
    );

    if (confirmName !== formData.name) {
      if (confirmName !== null) {
        alert("Workspace name does not match. Deletion cancelled.");
      }
      return;
    }

    if (!confirm("Are you absolutely sure? This will permanently delete the workspace and all its data.")) {
      return;
    }

    try {
      const res = await fetch("/api/workspace/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: formData.name }),
      });

      if (res.ok) {
        alert("Workspace deleted successfully. Redirecting...");
        window.location.href = "/dashboard";
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete workspace");
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      alert("Failed to delete workspace");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Workspace Brand */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Workspace Brand</h2>
        </div>

        <div className="space-y-6">
          {/* Logo Upload */}
          <WorkspaceLogoUpload
            logo={logo}
            onLogoChange={(newLogo) => {
              setLogo(newLogo);
              setSaved(false);
            }}
          />

          {/* Workspace Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Workspace Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Your Workspace"
            />
            <p className="text-xs text-muted-foreground">Appears on invoices, reminders, and recaps.</p>
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Business Type</label>
            <select
              value={formData.businessType}
              onChange={(e) => handleChange("businessType", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="Freelancer">Freelancer</option>
              <option value="Studio">Studio</option>
              <option value="Agency">Agency</option>
              <option value="Company">Company</option>
            </select>
            <p className="text-xs text-muted-foreground">Helps us tailor templates & agreements.</p>
          </div>

          {/* Preview Block */}
          <WorkspacePreview
            name={formData.name}
            businessType={formData.businessType}
            logo={logo}
            address={`${formData.addressLine1}, ${formData.city}, ${formData.state}`}
            taxId={formData.taxGstNumber}
          />
        </div>
      </motion.div>

      {/* Card 2: Business Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Business Details</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Tax/GST Number */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Tax / GST Number</label>
            <input
              type="text"
              value={formData.taxGstNumber}
              onChange={(e) => handleChange("taxGstNumber", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="29ABCDE1234F2Z5"
            />
            <p className="text-xs text-muted-foreground">Appears on invoices and month-end recap.</p>
          </div>

          {/* PAN */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">PAN (Optional)</label>
            <input
              type="text"
              value={formData.pan}
              onChange={(e) => handleChange("pan", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="ABCDE1234F"
            />
            <p className="text-xs text-muted-foreground">For tax compliance and reporting.</p>
          </div>

          {/* Registered Email */}
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-foreground">Registered Email for Invoices (Optional)</label>
            <input
              type="email"
              value={formData.registeredEmail}
              onChange={(e) => handleChange("registeredEmail", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="billing@yourworkspace.com"
            />
            <p className="text-xs text-muted-foreground">Used for official invoice communications.</p>
          </div>
        </div>
      </motion.div>

      {/* Card 3: Address */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Address & Billing Details</h2>
        </div>

        <div className="space-y-6">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Address Line 1</label>
            <textarea
              value={formData.addressLine1}
              onChange={(e) => handleChange("addressLine1", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Street address, building number"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Address Line 2 (Optional)</label>
            <input
              type="text"
              value={formData.addressLine2}
              onChange={(e) => handleChange("addressLine2", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Apartment, suite, unit, etc."
            />
          </div>

          {/* City, State, Pin - 3 Column Layout */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Maharashtra"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Pin / Postcode</label>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => handleChange("pin", e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="400001"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Country</label>
            <select
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Card 4: Connected Accounts Summary */}
      <ConnectedAccounts />

      {/* Card 5: Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl border border-red-200/50 bg-red-50/30 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
        </div>

        <div className="space-y-4">
          {/* Export Workspace Data */}
          <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-white/80 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Export Workspace Data</h3>
              <p className="text-xs text-muted-foreground">Download all invoices, clients, and settings as JSON.</p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Transfer Ownership */}
          <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-white/80 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Transfer Workspace Ownership</h3>
              <p className="text-xs text-muted-foreground">Transfer this workspace to another member.</p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-primary/5"
            >
              <Users className="h-4 w-4" />
              Transfer
            </button>
          </div>

          {/* Delete Workspace */}
          <div className="flex items-center justify-between rounded-xl border border-red-300/70 bg-red-50/50 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-900">Delete Workspace</h3>
              <p className="text-xs text-red-700">Permanently delete this workspace and all its data. This cannot be undone.</p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="sticky bottom-4 flex items-center justify-end gap-4 rounded-xl border border-white/20 bg-white/90 p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>All changes saved</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-amber-500" />
              <span>Unsaved changes</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(16,185,129,0.4)] transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {saving ? "Saving..." : "Save & Update"}
        </button>
      </div>
    </div>
  );
}

