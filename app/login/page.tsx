"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock, ShieldCheck, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const router = useRouter();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleGoogle = async () => {
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!emailRegex.test(email.trim())) {
      setError("Enter a valid email.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (res?.error) {
        const message =
          res.error === "Account not found"
            ? "No account found for this email."
            : res.error === "Use Google sign-in for this account"
              ? "This account uses Google sign-in. Please continue with Google."
              : res.error === "Missing credentials"
                ? "Enter your email and password."
                : res.error === "Invalid credentials"
                  ? "Invalid email or password."
                  : res.error === "Verify email to continue"
                    ? "Please verify your email before signing in."
                  : "Could not sign in. Please try again.";
        setError(message);
        setFailedAttempts((prev) => prev + 1);
      } else {
        setFailedAttempts(0);
        router.push("/dashboard");
      }
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setStatus(null);
    if (!emailRegex.test(email.trim())) {
      setError("Enter a valid email to resend verification.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send verification email.");
      } else {
        setStatus("Verification link sent. Check your email.");
        if (data.verifyUrl) {
          setStatus(`Verification link (dev): ${data.verifyUrl}`);
        }
      }
    } catch {
      setError("Could not send verification email.");
    } finally {
      setLoading(false);
    }
  };

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
          <GoogleButton label="Continue with Google" onClick={handleGoogle} disabled={loading} />

          <DividerLine />

          <form className="space-y-4" onSubmit={handleCredentials}>
            <InputField
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@paperchai.com"
              disabled={loading}
              autoComplete="email"
            />
            <InputField
              label="Password"
              icon={Lock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
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

            <PrimaryButton type="submit" icon={<ShieldCheck className="h-4 w-4" />} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
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
          {(failedAttempts >= 2 || (error && error.toLowerCase().includes("verify"))) && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
                disabled={loading}
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
