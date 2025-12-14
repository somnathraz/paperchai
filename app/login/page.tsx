"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth, useAuthRedirect } from "@/features/auth/hooks";
import { validateEmail } from "@/features/auth/utils";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Use Redux auth state and actions
  const { login, loginWithGoogle, resendVerification, isLoading, error, status, clearError, clearStatus } = useAuth();

  // Auto-redirect if already authenticated
  useAuthRedirect();

  // Memoized validation - avoid re-computing on every render
  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const canSubmit = useMemo(() => isEmailValid && password.length > 0, [isEmailValid, password]);

  // useCallback for event handlers - stable references, prevent re-renders
  const handleGoogle = useCallback(async () => {
    clearError();
    clearStatus();
    await loginWithGoogle();
  }, [loginWithGoogle, clearError, clearStatus]);

  const handleCredentials = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();
      clearStatus();

      if (!isEmailValid || !password) {
        return;
      }

      const result = await login(email, password);

      if (!result.type.includes("rejected")) {
        setFailedAttempts(0);
      } else {
        setFailedAttempts((prev) => prev + 1);
      }
    },
    [email, password, isEmailValid, login, clearError, clearStatus]
  );

  const handleResendVerification = useCallback(async () => {
    if (!isEmailValid) {
      return;
    }
    await resendVerification(email);
  }, [email, isEmailValid, resendVerification]);

  // Memoize whether to show resend button
  const showResendButton = useMemo(
    () => failedAttempts >= 2 || (error && error.toLowerCase().includes("verify")),
    [failedAttempts, error]
  );

  return (
    <AuthLayout
      badgeText="PaperChai · Secure login"
      title="Sign in and let autopilot handle the chasing."
      subtitle="Use Google or your email to access your reliability scores, reminders, and premium invoices. Two-factor and secure sessions keep your data safe."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="PaperChai workspace" subtitle="Welcome back" />

        <div className="space-y-4">
          <GoogleButton label="Continue with Google" onClick={handleGoogle} disabled={isLoading} />

          <DividerLine />

          <form className="space-y-4" onSubmit={handleCredentials}>
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
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {status && (
              <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700">
                {status}
              </div>
            )}

            <PrimaryButton type="submit" icon={<ShieldCheck className="h-4 w-4" />} disabled={isLoading || !canSubmit}>
              {isLoading ? "Signing in..." : "Sign in"}
            </PrimaryButton>

            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/50 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <span>🔐 Bank-grade encryption</span>
              <span>·</span>
              <span>🔄 Secure sessions</span>
              <span>·</span>
              <span>🛡️ Client data stays private</span>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
          {showResendButton && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
                disabled={isLoading}
              >
                Resend verification email
              </button>
            </div>
          )}
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            ✨ 98% users logged in last week • 1,200+ active workspaces
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
