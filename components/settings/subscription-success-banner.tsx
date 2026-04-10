"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SubscriptionSuccessBanner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      toast.success("Plan upgraded! Your new features are active now.", {
        duration: 6000,
        description: "It may take a few seconds for your plan to reflect here.",
      });
      // Remove the query param without a full reload
      const url = new URL(window.location.href);
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  return null;
}
