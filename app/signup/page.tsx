"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mail, Lock, UserPlus, AlertCircle } from "lucide-react";
import { useAuth, useAuthRedirect } from "@/features/auth/hooks";
import { validateEmail, validatePassword, validatePasswordMatch } from "@/features/auth/utils";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { DividerLine } from "@/components/auth/DividerLine";
import { InputField } from "@/components/auth/InputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const quickFacts = [
  { label: "Reliability", value: "98.2%" },
  { label: "Avg payout time", value: "7.1 days" },
  { label: "Reminders", value: "Email + WhatsApp" },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Use Redux auth state and actions
  const { signup, loginWithGoogle, isLoading, error, status, clearError, clearStatus } = useAuth();

  // Auto-redirect if already authenticated
  useAuthRedirect();

  // Memoized validations
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordMatchValidation = useMemo(() => validatePasswordMatch(password, confirm), [password, confirm]);

  const canSubmit = useMemo(
    () => emailValidation && passwordValidation.valid && passwordMatchValidation.valid,
    [emailValidation, passwordValidation, passwordMatchValidation]
  );

  // useCallback for stable references
  const handleGoogle = useCallback(async () => {
    clearError();
    clearStatus();
    await loginWithGoogle();
  }, [loginWithGoogle, clearError, clearStatus]);

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      clearStatus();
      setLocalError(null);

      // Validation
      if (!emailValidation) {
        setLocalError("Enter a valid email.");
        return;
      }
      if (!passwordValidation.valid) {
        setLocalError(passwordValidation.error || "Invalid password");
        return;
      }
      if (!passwordMatchValidation.valid) {
        setLocalError(passwordMatchValidation.error || "Passwords do not match");
        return;
      }

      const result = await signup(email, password);

      // Clear form on success
      if (!result.type.includes("rejected")) {
        setEmail("");
        setPassword("");
        setConfirm("");
      }
    },
    [email, password, confirm, emailValidation, passwordValidation, passwordMatchValidation, signup, clearError, clearStatus]
  );

  const displayError = localError || error;

  return (
    <AuthLayout
      badgeText="PaperChai · Create account"
      title="Join PaperChai and let autopilot handle the chasing."
      subtitle="Set up reminders, reliability scores, and premium invoices in minutes. Your brand stays on top—PaperChai stays invisible."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="PaperChai onboarding" subtitle="Create your workspace" />

        <div className="space-y-4">
          <GoogleButton label="Sign up with Google" onClick={handleGoogle} disabled={isLoading} />

          <DividerLine />

          <form className="space-y-4" onSubmit={handleSignup}>
            <InputField
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@paperchai.com"
              disabled={isLoading}
              autoComplete="email"
            />
            <InputField
              label="Password"
              icon={Lock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <InputField
              label="Confirm password"
              icon={Lock}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
            />

            {displayError && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {displayError}
              </div>
            )}
            {status && (
              <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">
                {status}
              </div>
            )}

            <PrimaryButton type="submit" icon={<UserPlus className="h-4 w-4" />} disabled={isLoading || !canSubmit}>
              {isLoading ? "Creating..." : "Create account"}
            </PrimaryButton>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
