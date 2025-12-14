"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks";
import { validatePassword, validatePasswordMatch } from "@/features/auth/utils";
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Use Redux auth state
  const { resetPassword, isLoading, error, status, clearError, clearStatus } = useAuth();

  useEffect(() => {
    if (!token) {
      setLocalError("Invalid reset link. Request a new one.");
    }
  }, [token]);

  // Memoized validations
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordMatchValidation = useMemo(() => validatePasswordMatch(password, confirm), [password, confirm]);
  const canSubmit = useMemo(
    () => token && passwordValidation.valid && passwordMatchValidation.valid,
    [token, passwordValidation, passwordMatchValidation]
  );

  // useCallback for stable reference
  const handleReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      clearStatus();
      setLocalError(null);

      if (!token) {
        setLocalError("Reset link is missing.");
        return;
      }
      if (!passwordValidation.valid) {
        setLocalError(passwordValidation.error || "Invalid password");
        return;
      }
      if (!passwordMatchValidation.valid) {
        setLocalError(passwordMatchValidation.error || "Passwords must match");
        return;
      }

      const result = await resetPassword(token, password);

      if (!result.type.includes("rejected")) {
        setPassword("");
        setConfirm("");
        setTimeout(() => router.push("/login"), 1200);
      }
    },
    [token, password, passwordValidation, passwordMatchValidation, resetPassword, clearError, clearStatus, router]
  );

  const displayError = localError || error;

  return (
    <AuthLayout
      badgeText="PaperChai · Secure reset"
      title="Set a fresh password and keep cash moving."
      subtitle="Reset links expire after 60 minutes. Choose a strong password to keep clients and payouts secure."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="Create new password" subtitle="Secure your workspace" />
        <form className="space-y-4" onSubmit={handleReset}>
          <InputField
            label="New password"
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <InputField
            label="Confirm password"
            icon={Lock}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
          />

          {displayError && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}
          {status && (
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">
              {status}
            </div>
          )}

          <PrimaryButton type="submit" icon={<ShieldCheck className="h-4 w-4" />} disabled={isLoading || !canSubmit}>
            {isLoading ? "Updating..." : "Update password"}
          </PrimaryButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No link?{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Request a new one
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
