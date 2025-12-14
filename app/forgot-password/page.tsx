"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { InputField } from "@/components/auth/InputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const quickFacts = [
  { label: "Reliability", value: "98.2%" },
  { label: "Avg payout time", value: "7.1 days" },
  { label: "Reminders", value: "Email + WhatsApp" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send reset link.");
      } else {
        setStatus(data.resetUrl ? `Reset link (dev): ${data.resetUrl}` : data.message);
      }
    } catch {
      setError("Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badgeText="PaperChai · Reset access"
      title="Reset your password and get paid without friction."
      subtitle="We’ll email you a secure link to reset your password. Links expire after 1 hour."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="Reset access" subtitle="We’ll send a secure link" />
        <form className="space-y-4" onSubmit={handleRequest}>
          <InputField
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@paperchai.com"
            disabled={loading}
          />

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {status && (
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">
              {status}
            </div>
          )}

          <PrimaryButton type="submit" icon={<RefreshCw className="h-4 w-4" />} disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </PrimaryButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Return to login
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
