"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Request a new one.");
    }
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!token) {
      setError("Reset link is missing.");
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
      } else {
        setStatus("Password updated. You can now sign in.");
        setPassword("");
        setConfirm("");
        setTimeout(() => router.push("/login"), 1200);
      }
    } catch {
      setError("Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

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
            disabled={loading}
          />
          <InputField
            label="Confirm password"
            icon={Lock}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
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

          <PrimaryButton type="submit" icon={<ShieldCheck className="h-4 w-4" />} disabled={loading}>
            {loading ? "Updating..." : "Update password"}
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
