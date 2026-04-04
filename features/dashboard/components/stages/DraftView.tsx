import { DashboardState } from "@/features/dashboard/lib/get-dashboard-state";
import { FileText, ArrowRight, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Props = {
  state: DashboardState;
};

export function DraftView({ state }: Props) {
  // If we have a draft, we must have a draft count > 0 theoretically.
  // Ideally we would show the specific draft details if we fetched them.
  // For now, generic message or "Go to drafts".
  // The spec says: "You have 1 draft invoice ready". Clear step "Send to client".

  const hasDrafts = state.meta.draftCount > 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Hero Card */}
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
        <div className="p-4 rounded-full bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-100">
          <FileText className="h-10 w-10" />
        </div>
        <div className="space-y-2 max-w-lg">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            You have {state.meta.draftCount} draft{" "}
            {state.meta.draftCount === 1 ? "invoice" : "invoices"} ready
          </h2>
          <p className="text-lg text-muted-foreground">
            It looks like you started an invoice but didn&apos;t send it. Finish it now to get the
            ball rolling.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
          <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20">
            <Link href="/invoices?status=draft">
              Send to client <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/invoices?status=draft">
              <PenSquare className="h-4 w-4 mr-2" />
              Edit invoice
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
