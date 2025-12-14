"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MailCheck, XCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const quickFacts = [
  { label: "Reliability", value: "98.2%" },
  { label: "Avg payout time", value: "7.1 days" },
  { label: "Reminders", value: "Email + WhatsApp" },
];

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Verifying your email...");

  // Memoized status checks
  const isPending = useMemo(() => status === "pending", [status]);
  const isSuccess = useMemo(() => status === "success", [status]);
  const isError = useMemo(() => status === "error", [status]);

  // useCallback for stable reference
  const handleGoToLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification link is invalid.");
        return;
      }
      try {
        // Direct API call (no Redux action needed for this one-time operation)
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Could not verify email.");
        } else {
          setStatus("success");
          setMessage("Email verified. You can now sign in.");
          setTimeout(() => router.push("/login"), 1200);
        }
      } catch (error) {
        setStatus("error");
        setMessage("Could not verify email.");
      }
    };
    run();
  }, [router, token]);

  return (
    <AuthLayout
      badgeText="PaperChai · Verify email"
      title="Verify your email to unlock autopilot."
      subtitle="Email verification keeps your payouts and reminders secure."
      quickFacts={quickFacts}
    >
      <AuthCard>
        <AuthHeader title="Email verification" subtitle="Secure your workspace" />

        <div className="space-y-6 text-center">
          {isPending && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <MailCheck className="h-5 w-5 text-primary" />
                <span>{message}</span>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="space-y-2 text-sm text-emerald-700">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>{message}</span>
              </div>
            </div>
          )}

          {isError && (
            <div className="space-y-2 text-sm text-destructive">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span>{message}</span>
              </div>
              <p className="text-muted-foreground">
                You can request a fresh link from the login page.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <PrimaryButton
              type="button"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={handleGoToLogin}
            >
              Go to login
            </PrimaryButton>
            <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
              Forgot password? Request a reset
            </Link>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
