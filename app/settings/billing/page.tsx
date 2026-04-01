import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { CreditCard, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/billing");
  }

  return (
    <SettingsLayout
      current="/settings/billing"
      title="Billing & subscription"
      description="Manage your PaperChai plan and payment details."
    >
      <div className="space-y-6">
        {/* Current plan — free during beta */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Current plan
              </p>
              <p className="text-lg font-semibold">Free beta</p>
              <p className="text-sm text-muted-foreground">
                Full access while we&apos;re in beta. No credit card required.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
        </div>

        {/* Coming soon banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-emerald-50/60 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Paid plans coming soon</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;re finalising pricing for Pro and Teams tiers. Early users will get a
                discounted rate. Payments will be processed securely via Stripe or Razorpay — your
                data stays in your workspace.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-xl border border-border/60 bg-white/80 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Starter
                  </p>
                  <p className="mt-1 text-lg font-bold">Free</p>
                  <p className="text-xs text-muted-foreground">5 invoices/mo</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">Pro</p>
                  <p className="mt-1 text-lg font-bold">Coming soon</p>
                  <p className="text-xs text-muted-foreground">Unlimited + AI</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-white/80 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Teams</p>
                  <p className="mt-1 text-lg font-bold">Coming soon</p>
                  <p className="text-xs text-muted-foreground">Multi-workspace</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment method placeholder */}
        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Payment method</p>
              <p className="text-xs text-muted-foreground">
                No payment method on file — not required during beta.
              </p>
            </div>
          </div>
        </div>

        {/* Contact link */}
        <p className="text-center text-xs text-muted-foreground">
          Questions about pricing?{" "}
          <Link
            href="mailto:hello@paperchai.com"
            className="font-semibold text-primary hover:underline"
          >
            Get in touch
            <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </p>
      </div>
    </SettingsLayout>
  );
}
