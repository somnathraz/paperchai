"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsLayout } from "@/components/settings/settings-layout";

type AutopilotSettings = {
  autoEscalateRiskyClients: boolean;
  autoSendMonthlyRecap: boolean;
};

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner transition hover:bg-white">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="relative ml-4 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          onClick={() => !disabled && onChange(!checked)}
          className={`flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-muted"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
    </label>
  );
}

export default function AIAutopilotSettingsPage() {
  const [settings, setSettings] = useState<AutopilotSettings>({
    autoEscalateRiskyClients: true,
    autoSendMonthlyRecap: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            autoEscalateRiskyClients: data.settings.autoEscalateRiskyClients ?? true,
            autoSendMonthlyRecap: data.settings.autoSendMonthlyRecap ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: keyof AutopilotSettings, value: boolean) => {
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Setting saved");
    } catch {
      setSettings((s) => ({ ...s, [key]: prev }));
      toast.error("Could not save setting. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout
      current="/settings/ai-autopilot"
      title="AI autopilot"
      description="Control when PaperChai acts on your behalf."
    >
      <div className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading settings…
          </div>
        ) : (
          <>
            <ToggleRow
              title="Auto-escalate risky clients"
              description="PaperChai nudges using a firmer tone after 10 days."
              checked={settings.autoEscalateRiskyClients}
              disabled={saving}
              onChange={(v) => updateSetting("autoEscalateRiskyClients", v)}
            />
            <ToggleRow
              title="Auto-send monthly recap"
              description="Automatically generate the recap card at month end."
              checked={settings.autoSendMonthlyRecap}
              disabled={saving}
              onChange={(v) => updateSetting("autoSendMonthlyRecap", v)}
            />
          </>
        )}
      </div>
    </SettingsLayout>
  );
}
