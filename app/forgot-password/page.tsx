"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/hooks";
import { validateEmail } from "@/features/auth/utils";
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

  // Use Redux auth state instead of local state
  const { forgotPassword, isLoading, error, status, clearError, clearStatus } = useAuth();

  // Memoized validation
  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const canSubmit = useMemo(() => isEmailValid, [isEmailValid]);

  // useCallback for stable reference
  const handleRequest = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      clearStatus();

      if (!isEmailValid) {
        return;
      }

      await forgotPassword(email);
    },
    [email, isEmailValid, forgotPassword, clearError, clearStatus]
  );

  return (
    <AuthLayout
      badgeText="PaperChai · Reset access"
      title="Reset your password and get paid without friction."
      subtitle="We'll email you a secure link to reset your password. Links expire after 1 hour."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="Reset access" subtitle="We'll send a secure link" />
        <form className="space-y-4" onSubmit={handleRequest}>
          <InputField
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@paperchai.com"
            disabled={isLoading}
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

          <PrimaryButton type="submit" icon={<RefreshCw className="h-4 w-4" />} disabled={isLoading || !canSubmit}>
            {isLoading ? "Sending..." : "Send reset link"}
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
