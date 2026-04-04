"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Users, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

type Step = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

const STEPS: Step[] = [
  {
    id: "workspace",
    title: "Set up your workspace",
    description: "Add your business name and logo so invoices look professional.",
    icon: Building2,
  },
  {
    id: "client",
    title: "Add your first client",
    description: "Enter a client's details — you can always add more later.",
    icon: Users,
  },
  {
    id: "invoice",
    title: "Create your first invoice",
    description: "Pick a template and send your first invoice in under a minute.",
    icon: FileText,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleNext() {
    setError("");

    if (step === 0) {
      if (!businessName.trim()) {
        setError("Please enter a business name.");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/workspace/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: businessName.trim() }),
        });
        if (!res.ok) throw new Error("Failed to save");
      } catch {
        setError("Could not save workspace. Please try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step === 1) {
      if (!clientName.trim()) {
        setError("Please enter a client name.");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: clientName.trim(), email: clientEmail.trim() || undefined }),
        });
        if (!res.ok) throw new Error("Failed to save");
      } catch {
        setError("Could not save client. Please try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (isLast) {
      router.push("/invoices/new");
      return;
    }

    setStep((s) => s + 1);
  }

  function handleSkip() {
    if (isLast) {
      router.push("/dashboard");
    } else {
      setStep((s) => s + 1);
    }
  }

  const Icon = current.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-[#f7fafc] to-[#ecf2f7] px-4">
      <div className="w-full max-w-md">
        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary w-8" : "bg-border w-4"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          {/* Icon + heading */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 className="mt-1 text-xl font-bold text-foreground">{current.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
          </div>

          {/* Step content */}
          <div className="space-y-4">
            {step === 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Business / workspace name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Design Studio"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Client name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Email <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-800">
                  You&apos;re all set! Click below to create your first invoice.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {saving ? "Saving…" : isLast ? "Create invoice" : "Continue"}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Skip everything link */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <button onClick={() => router.push("/dashboard")} className="hover:underline">
            Skip setup and go to dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
