"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mail, Lock, UserPlus, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!emailRegex.test(email.trim())) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          res.status === 409
            ? "An account with this email already exists."
            : data.error || "Could not create account. Try again.";
        setError(message);
        return;
      }
      const data = await res.json();
      setStatus("Account created. Check your email for a verification link.");
      if (data?.verifyUrl) {
        setStatus(`Account created. Verify via link: ${data.verifyUrl}`);
      }
      setEmail("");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <GoogleButton label="Sign up with Google" onClick={handleGoogle} disabled={loading} />

          <DividerLine />

          <form className="space-y-4" onSubmit={handleSignup}>
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
              autoComplete="new-password"
            />
            <InputField
              label="Confirm password"
              icon={Lock}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
            />

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

            <PrimaryButton type="submit" icon={<UserPlus className="h-4 w-4" />} disabled={loading}>
              {loading ? "Creating..." : "Create account"}
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
