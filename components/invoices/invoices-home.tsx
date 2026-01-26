"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateGallery } from "@/components/invoices/template-gallery";

type DraftInvoice = {
  id: string;
  number: string;
  clientName: string;
  amount: string;
  updatedAt: string;
  automationName?: string | null;
  approvalStatus?: string | null;
};

type InvoicesHomeProps = {
  firstName: string;
  templates: {
    slug: string;
    name: string;
    isPro: boolean;
    tags?: string | null;
    accent?: string | null;
    category?: string | null;
  }[];
  drafts: DraftInvoice[];
};

export function InvoicesHome({ firstName, templates, drafts }: InvoicesHomeProps) {
  const [showGallery, setShowGallery] = useState(false);

  const sortedDrafts = useMemo(() => drafts, [drafts]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Drafts</p>
            <h1 className="text-2xl font-semibold text-foreground">Review draft invoices</h1>
            <p className="text-sm text-muted-foreground">
              Check automation-created drafts before they are sent.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowGallery((prev) => !prev)}
            className="w-full sm:w-auto"
          >
            {showGallery ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide template gallery
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                View template gallery
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {sortedDrafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
              No draft invoices yet.
            </div>
          ) : (
            sortedDrafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/invoices/new?id=${draft.id}`}
                className="block rounded-2xl border border-border/60 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">#{draft.number}</p>
                    <p className="text-xs text-muted-foreground">{draft.clientName}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{draft.amount}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Updated {new Date(draft.updatedAt).toLocaleDateString("en-IN")}</span>
                  {draft.automationName ? (
                    <Badge variant="outline" className="text-[10px]">
                      Automation: {draft.automationName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Manual draft
                    </Badge>
                  )}
                  {draft.approvalStatus === "PENDING" ? (
                    <Badge variant="outline" className="text-[10px] text-amber-700">
                      Approval pending
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {showGallery ? (
        <TemplateGallery firstName={firstName} templates={templates} variant="embedded" />
      ) : null}
    </div>
  );
}
