"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";
import { getPlanDefinition, normalizePlanCode, type PlanCode } from "@/lib/billing/plans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const BILLING_UPGRADE_EVENT = "paperchai:billing-upgrade-success";

export function notifyBillingUpgradeSuccess(planCode: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BILLING_UPGRADE_EVENT, {
      detail: { planCode: normalizePlanCode(planCode) },
    })
  );
}

export function BillingUpgradeCelebration() {
  const [open, setOpen] = useState(false);
  const [planCode, setPlanCode] = useState<PlanCode | null>(null);

  useEffect(() => {
    const onUpgrade = (e: Event) => {
      const detail = (e as CustomEvent<{ planCode?: string }>).detail;
      if (!detail?.planCode) return;
      setPlanCode(normalizePlanCode(detail.planCode));
      setOpen(true);
    };
    window.addEventListener(BILLING_UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(BILLING_UPGRADE_EVENT, onUpgrade);
  }, []);

  const plan = planCode ? getPlanDefinition(planCode) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md overflow-hidden border-primary/25 bg-gradient-to-b from-primary/10 via-background to-background sm:rounded-2xl">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner"
          >
            <PartyPopper className="h-8 w-8" aria-hidden />
          </motion.div>
          <DialogTitle className="text-xl font-semibold">
            {plan ? `You're on ${plan.name} now` : "Plan updated"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {plan ? (
              <>
                Payment went through. Your workspace limits and features match{" "}
                <span className="font-medium text-foreground">{plan.name}</span> right away.
              </>
            ) : (
              "Payment went through. Your workspace is updating to the new plan."
            )}
          </DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-medium text-primary"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Tip: scroll the plan cards below to explore your next upgrade anytime.</span>
        </motion.div>
        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setOpen(false);
              document.getElementById("workspace-plans")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            View plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
